import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Controls for per-test return values
let singleResult: { data: unknown; error: unknown };
let limitResult: { data: unknown; error: unknown };
let authUserId: string | null;

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();

const mockChain = {
  select: (...args: unknown[]) => { mockSelect(...args); return mockChain; },
  insert: (...args: unknown[]) => { mockInsert(...args); return mockChain; },
  update: (...args: unknown[]) => { mockUpdate(...args); return mockChain; },
  upsert: (...args: unknown[]) => { mockUpsert(...args); return mockChain; },
  eq: (...args: unknown[]) => { mockEq(...args); return mockChain; },
  limit: (...args: unknown[]) => { mockLimit(...args); return Promise.resolve(limitResult); },
  single: () => { mockSingle(); return Promise.resolve(singleResult); },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => mockChain,
    auth: {
      getUser: () => Promise.resolve({
        data: { user: authUserId ? { id: authUserId } : null },
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
  RATE_LIMITS: { auth: { limit: 10, windowMs: 60000 } },
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.ENCRYPTION_KEY = "test-key-for-vitest-32chars!!!!!";
});

describe("/api/invite", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/invite/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    authUserId = "user-abc-123";
    singleResult = { data: null, error: null };
    limitResult = { data: [], error: null };
    vi.clearAllMocks();
  });

  it("rejects missing params", async () => {
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unauthorized", async () => {
    authUserId = null;
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("get returns existing invite code", async () => {
    singleResult = { data: { code: "abc123", uses: 3 }, error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "t1" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.code).toBe("abc123");
    expect(data.uses).toBe(3);
  });

  it("get creates new invite code if none exists", async () => {
    singleResult = { data: null, error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "get", accessToken: "t1" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.code).toBeDefined();
    expect(data.uses).toBe(0);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("redeem returns 404 for invalid code", async () => {
    singleResult = { data: null, error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "redeem", accessToken: "t1", code: "bad-code" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("redeem prevents self-invite", async () => {
    singleResult = { data: { inviter_id: "user-abc-123", uses: 0 }, error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "redeem", accessToken: "t1", code: "some-code" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Cannot use own invite");
  });

  it("redeem prevents double redemption", async () => {
    singleResult = { data: { inviter_id: "other-user-456", uses: 1 }, error: null };
    limitResult = { data: [{ id: "existing-redemption" }], error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "redeem", accessToken: "t1", code: "valid-code" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Already redeemed an invite");
  });

  it("redeem awards seeds to both users", async () => {
    singleResult = { data: { inviter_id: "other-user-456", uses: 2, balance: 100 }, error: null };
    limitResult = { data: [], error: null };
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "redeem", accessToken: "t1", code: "valid-code" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.redeemed).toBe(true);
    expect(data.inviterReward).toBe(50);
    expect(data.invitedReward).toBe(20);
  });

  it("rejects unknown action", async () => {
    const req = new Request("http://localhost/api/invite", {
      method: "POST",
      body: JSON.stringify({ action: "unknown", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
