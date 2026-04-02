import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

const mockChain = {
  select: (...args: unknown[]) => { mockSelect(...args); return mockChain; },
  insert: (...args: unknown[]) => { mockInsert(...args); return mockChain; },
  update: (...args: unknown[]) => { mockUpdate(...args); return mockChain; },
  delete: () => { mockDelete(); return mockChain; },
  eq: (...args: unknown[]) => { mockEq(...args); return mockChain; },
  gte: (...args: unknown[]) => { mockGte(...args); return mockChain; },
  order: (...args: unknown[]) => { mockOrder(...args); return mockChain; },
  limit: (...args: unknown[]) => { mockLimit(...args); return Promise.resolve({ data: [], error: null }); },
  single: () => { mockSingle(); return Promise.resolve({ data: { id: "test-id" }, error: null }); },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => mockChain,
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.ENCRYPTION_KEY = "test-key-for-vitest-32chars!!!!!";
});

describe("/api/mood", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/mood/route");
    POST = mod.POST;
  });

  it("rejects missing params", async () => {
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({ action: "unknown", userId: "u1", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("handles insert action", async () => {
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({
        action: "insert",
        userId: "u1",
        accessToken: "t1",
        emoji: "😊",
        label: "Good",
        trigger: "Nice weather",
        helped: "Walk",
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.id).toBe("test-id");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("encrypts trigger and helped on insert", async () => {
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({
        action: "insert",
        userId: "u1",
        accessToken: "t1",
        emoji: "😊",
        label: "Good",
        trigger: "Work stress",
      }),
    });
    await POST(req);
    const insertArg = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0];
    // Trigger should be encrypted (starts with "enc:")
    expect(insertArg.trigger.startsWith("enc:")).toBe(true);
    expect(insertArg.trigger).not.toBe("Work stress");
  });
});
