import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

const mockChain = {
  select: (...args: unknown[]) => { mockSelect(...args); return mockChain; },
  insert: (...args: unknown[]) => { mockInsert(...args); return mockChain; },
  update: (...args: unknown[]) => { mockUpdate(...args); return mockChain; },
  delete: () => { mockDelete(); return mockChain; },
  eq: (...args: unknown[]) => { mockEq(...args); return mockChain; },
  order: (...args: unknown[]) => { mockOrder(...args); return mockChain; },
  limit: (...args: unknown[]) => { mockLimit(...args); return Promise.resolve({ data: [], error: null }); },
  single: () => { mockSingle(); return Promise.resolve({ data: { id: "test-id" }, error: null }); },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => mockChain,
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: "user-123" } },
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

describe("/api/journal", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/journal/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    mockSelect.mockClear();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockEq.mockClear();
    mockOrder.mockClear();
    mockLimit.mockClear();
    mockSingle.mockClear();
  });

  it("rejects missing params", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({ action: "unknown", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("list returns entries", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({ action: "list", accessToken: "t1" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalled();
  });

  it("insert creates entry with encrypted content", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({
        action: "insert",
        accessToken: "t1",
        content: "Today was a good day",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.id).toBe("test-id");
    expect(mockInsert).toHaveBeenCalled();
    const insertArg = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0];
    expect(insertArg.content.startsWith("enc:")).toBe(true);
    expect(insertArg.content).not.toBe("Today was a good day");
  });

  it("insert validates required content field", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({
        action: "insert",
        accessToken: "t1",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("delete works with valid id", async () => {
    const req = new Request("http://localhost/api/journal", {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        accessToken: "t1",
        id: "journal-123",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "journal-123");
  });
});
