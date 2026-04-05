import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

// Controls for per-test return values
let singleReturnValue: { data: unknown; error: unknown } = { data: null, error: null };
let limitReturnValue: { data: unknown; error: unknown } = { data: [], error: null };
let mockUserId: string | null = "user-123";

const mockChain = {
  select: (...args: unknown[]) => { mockSelect(...args); return mockChain; },
  insert: (...args: unknown[]) => { mockInsert(...args); return Promise.resolve({ data: null, error: null }); },
  upsert: (...args: unknown[]) => { mockUpsert(...args); return Promise.resolve({ data: null, error: null }); },
  eq: (...args: unknown[]) => { mockEq(...args); return mockChain; },
  gte: (...args: unknown[]) => { mockGte(...args); return mockChain; },
  order: (...args: unknown[]) => { mockOrder(...args); return mockChain; },
  limit: (...args: unknown[]) => { mockLimit(...args); return Promise.resolve(limitReturnValue); },
  single: () => { mockSingle(); return Promise.resolve(singleReturnValue); },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => mockChain,
    auth: {
      getUser: () => Promise.resolve({
        data: { user: mockUserId ? { id: mockUserId } : null },
        error: null,
      }),
    },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => true,
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
  getClientIp: () => "127.0.0.1",
  RATE_LIMITS: { crud: { limit: 60, windowMs: 60000 } },
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.ENCRYPTION_KEY = "test-key-for-vitest-32chars!!!!!";
});

describe("/api/seeds", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/seeds/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user-123";
    singleReturnValue = { data: null, error: null };
    limitReturnValue = { data: [], error: null };
  });

  it("rejects missing params", async () => {
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects missing accessToken", async () => {
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "get" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unauthorized when no valid user", async () => {
    mockUserId = null;
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "bad-token" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("get returns balance and history", async () => {
    singleReturnValue = { data: { balance: 42 }, error: null };
    limitReturnValue = {
      data: [{ action: "mood", amount: 5, created_at: "2026-04-04T10:00:00Z" }],
      error: null,
    };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "t1" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.balance).toBe(42);
    expect(data.history).toHaveLength(1);
  });

  it("get returns 0 balance when no record", async () => {
    singleReturnValue = { data: null, error: null };
    limitReturnValue = { data: [], error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "t1" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.balance).toBe(0);
    expect(data.history).toEqual([]);
  });

  it("award adds seeds and logs history", async () => {
    singleReturnValue = { data: { balance: 10 }, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "award", accessToken: "t1", seedAction: "mood", amount: 5 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.awarded).toBe(5);
    expect(data.balance).toBe(15);
  });

  it("award rejects duplicate same-day action", async () => {
    limitReturnValue = { data: [{ id: "existing-id" }], error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "award", accessToken: "t1", seedAction: "mood", amount: 5 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.awarded).toBe(0);
    expect(data.reason).toBe("already_awarded_today");
  });

  it("award skips dedup for streak actions", async () => {
    singleReturnValue = { data: { balance: 20 }, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "award", accessToken: "t1", seedAction: "streak7", amount: 20 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.awarded).toBe(20);
    expect(data.balance).toBe(40);
  });

  it("deduct reduces balance", async () => {
    singleReturnValue = { data: { balance: 20 }, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "deduct", accessToken: "t1", seedAction: "mood", amount: 5 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.deducted).toBe(5);
    expect(data.balance).toBe(15);
  });

  it("deduct never goes below 0", async () => {
    singleReturnValue = { data: { balance: 3 }, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "deduct", accessToken: "t1", seedAction: "mood", amount: 10 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.balance).toBe(0);
  });

  it("sync migrates when no DB balance", async () => {
    singleReturnValue = { data: null, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({
        action: "sync",
        accessToken: "t1",
        localBalance: 25,
        localHistory: [{ action: "mood", amount: 5, date: "2026-04-01T10:00:00Z" }],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.synced).toBe(true);
    expect(data.balance).toBe(25);
  });

  it("sync returns existing DB balance when present", async () => {
    singleReturnValue = { data: { balance: 50 }, error: null };
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "sync", accessToken: "t1", localBalance: 25, localHistory: [] }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.synced).toBe(false);
    expect(data.balance).toBe(50);
  });

  it("award rejects zero amount", async () => {
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "award", accessToken: "t1", seedAction: "mood", amount: 0 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("award rejects negative amount", async () => {
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "award", accessToken: "t1", seedAction: "mood", amount: -5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    const req = new Request("http://localhost/api/seeds", {
      method: "POST",
      body: JSON.stringify({ action: "unknown", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
