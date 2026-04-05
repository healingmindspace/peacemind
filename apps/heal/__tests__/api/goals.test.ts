import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

let insertData: Record<string, unknown> = {};
let updateData: Record<string, unknown> = {};

const mockChain = {
  select: () => mockChain,
  insert: (data: Record<string, unknown>) => { insertData = data; return mockChain; },
  update: (data: Record<string, unknown>) => { updateData = data; return mockChain; },
  delete: () => mockChain,
  eq: () => mockChain,
  neq: () => mockChain,
  order: () => mockChain,
  limit: () => Promise.resolve({ data: [{ sort_order: 0 }], error: null }),
  single: () => Promise.resolve({ data: { id: "goal-1" }, error: null }),
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

describe("/api/goals", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/goals/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    insertData = {};
    updateData = {};
  });

  it("encrypts goal name on insert", async () => {
    const req = new Request("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ action: "insert", userId: "u1", accessToken: "t1", name: "Exercise" }),
    });
    await POST(req);
    expect(insertData.name).toBeDefined();
    expect((insertData.name as string).startsWith("enc:")).toBe(true);
    expect(insertData.name).not.toBe("Exercise");
  });

  it("encrypts objective on insert", async () => {
    const req = new Request("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ action: "insert", userId: "u1", accessToken: "t1", name: "Fitness", objective: "Run a marathon" }),
    });
    await POST(req);
    expect(insertData.objective).toBeDefined();
    expect((insertData.objective as string).startsWith("enc:")).toBe(true);
  });

  it("soft deletes (sets deleted=true) instead of hard delete", async () => {
    const req = new Request("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ action: "delete", userId: "u1", accessToken: "t1", id: "goal-1" }),
    });
    await POST(req);
    expect(updateData.deleted).toBe(true);
    expect(updateData.active).toBe(false);
  });

  it("updates active and deleted flags on update", async () => {
    const req = new Request("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ action: "update", userId: "u1", accessToken: "t1", id: "goal-1", active: true, deleted: false }),
    });
    await POST(req);
    expect(updateData.active).toBe(true);
    expect(updateData.deleted).toBe(false);
  });
});
