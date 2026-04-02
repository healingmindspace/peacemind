import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

let insertData: Record<string, unknown> = {};
let updateData: Record<string, unknown> = {};

const mockChain = {
  select: () => mockChain,
  insert: (data: Record<string, unknown>) => { insertData = data; return mockChain; },
  update: (data: Record<string, unknown>) => { updateData = data; return mockChain; },
  delete: () => mockChain,
  eq: () => mockChain,
  order: () => mockChain,
  limit: () => Promise.resolve({ data: [], error: null }),
  single: () => Promise.resolve({ data: { id: "task-1" }, error: null }),
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

describe("/api/tasks", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/tasks/route");
    POST = mod.POST;
  });

  beforeEach(() => {
    insertData = {};
    updateData = {};
  });

  it("encrypts title and description on insert", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        action: "insert", userId: "u1", accessToken: "t1",
        goalId: "g1", title: "Practice piano", description: "30 minutes scales",
      }),
    });
    await POST(req);
    expect((insertData.title as string).startsWith("enc:")).toBe(true);
    expect((insertData.description as string).startsWith("enc:")).toBe(true);
    expect(insertData.title).not.toBe("Practice piano");
  });

  it("stores schedule_type and schedule_rule", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        action: "insert", userId: "u1", accessToken: "t1",
        title: "Meditate", scheduleType: "habit",
        scheduleRule: { freq: "daily", time: "07:00" }, duration: 15,
      }),
    });
    await POST(req);
    expect(insertData.schedule_type).toBe("habit");
    expect(insertData.schedule_rule).toEqual({ freq: "daily", time: "07:00" });
    expect(insertData.duration).toBe(15);
  });

  it("sets completed_at on toggle_complete", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ action: "toggle_complete", userId: "u1", accessToken: "t1", id: "task-1", completed: true }),
    });
    await POST(req);
    expect(updateData.completed).toBe(true);
    expect(updateData.completed_at).toBeDefined();
  });

  it("clears completed_at when uncompleting", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ action: "toggle_complete", userId: "u1", accessToken: "t1", id: "task-1", completed: false }),
    });
    await POST(req);
    expect(updateData.completed).toBe(false);
    expect(updateData.completed_at).toBeNull();
  });

  it("stores google_event_id on update", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ action: "update", userId: "u1", accessToken: "t1", id: "task-1", googleEventId: "gcal-123" }),
    });
    await POST(req);
    expect(updateData.google_event_id).toBe("gcal-123");
  });

  it("rejects missing title on insert", async () => {
    const req = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ action: "insert", userId: "u1", accessToken: "t1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
