/**
 * Local API adapter for anonymous users.
 * Intercepts API calls and routes them to IndexedDB instead of the server.
 * Returns the same response shape as the real API routes.
 */

import { localInsert, localQuery, localUpdate, localDelete } from "@/lib/local-store";

// --- Mood API ---

async function handleMood(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("moods", {
      id,
      user_id: body.userId,
      emoji: body.emoji,
      label: body.label,
      trigger: body.trigger || null,
      helped: body.helped || null,
      response: null,
      photo_path: body.photoPath || null,
      created_at: body.createdAt || new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const data = await localQuery("moods", {
      since: body.since as string | undefined,
      limit: body.limit as number | undefined,
    });
    return { data };
  }

  if (action === "delete") {
    await localDelete("moods", body.id as string);
    return { ok: true };
  }

  return { error: "Unknown action" };
}

// --- Mood Options API ---

async function handleMoodOptions(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "list") {
    const data = await localQuery("mood_options");
    return { data };
  }

  if (action === "insert") {
    const { type, label } = body;
    // Dedup check
    const existing = await localQuery("mood_options", {
      filters: { type, label },
    });
    if (existing.length > 0) {
      return { id: existing[0].id };
    }

    const id = crypto.randomUUID();
    await localInsert("mood_options", {
      id,
      type,
      label: String(label).slice(0, 200),
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "delete") {
    await localDelete("mood_options", body.id as string);
    return { ok: true };
  }

  return { error: "Unknown action" };
}

// --- Journal API ---

async function handleJournal(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("journals", {
      id,
      user_id: body.userId,
      content: body.content,
      response: null,
      photo_path: body.photoPath || null,
      parent_id: body.parentId || null,
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const data = await localQuery("journals", {
      limit: body.limit as number | undefined,
    });
    return { data };
  }

  if (action === "delete") {
    await localDelete("journals", body.id as string);
    return { ok: true };
  }

  return { error: "Unknown action" };
}

// --- Goals API ---

async function handleGoals(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("goals", {
      id,
      user_id: body.userId,
      name: body.name,
      icon: body.icon || null,
      objective: body.objective || null,
      plan: null,
      status: "active",
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const data = await localQuery("goals");
    return { data };
  }

  if (action === "update") {
    await localUpdate("goals", body.id as string, body.updates as Record<string, unknown>);
    return { ok: true };
  }

  if (action === "delete") {
    await localDelete("goals", body.id as string);
    return { ok: true };
  }

  return { error: "Unknown action" };
}

// --- Tasks API ---

async function handleTasks(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("tasks", {
      id,
      user_id: body.userId,
      goal_id: body.goalId || null,
      title: body.title,
      type: body.type || "one-time",
      schedule: body.schedule || null,
      completed: false,
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const filters: Record<string, unknown> = {};
    if (body.goalId) filters.goal_id = body.goalId;
    const data = await localQuery("tasks", { filters });
    return { data };
  }

  if (action === "update") {
    await localUpdate("tasks", body.id as string, body.updates as Record<string, unknown>);
    return { ok: true };
  }

  if (action === "delete") {
    await localDelete("tasks", body.id as string);
    return { ok: true };
  }

  return { error: "Unknown action" };
}

// --- Assessments API ---

async function handleAssessments(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("assessments", {
      id,
      user_id: body.userId,
      type: body.type,
      score: body.score,
      answers: body.answers,
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const data = await localQuery("assessments", {
      limit: body.limit as number | undefined,
    });
    return { data };
  }

  return { error: "Unknown action" };
}

// --- Breathing API ---

async function handleBreathing(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { action } = body;

  if (action === "insert") {
    const id = crypto.randomUUID();
    await localInsert("breathing_sessions", {
      id,
      user_id: body.userId,
      duration: body.duration,
      type: body.type || "breathing",
      created_at: new Date().toISOString(),
    });
    return { id };
  }

  if (action === "list") {
    const data = await localQuery("breathing_sessions", {
      limit: body.limit as number | undefined,
    });
    return { data };
  }

  return { error: "Unknown action" };
}

// --- Route map ---

const LOCAL_ROUTES: Record<string, (body: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  "/api/mood": handleMood,
  "/api/mood-options": handleMoodOptions,
  "/api/journal": handleJournal,
  "/api/goals": handleGoals,
  "/api/tasks": handleTasks,
  "/api/assessments": handleAssessments,
  "/api/breathing": handleBreathing,
};

// Routes that require server (AI, photos) — these won't work anonymously
const SERVER_ONLY_ROUTES = [
  "/api/mood-respond",
  "/api/extract-mood-photo",
  "/api/extract-photo",
  "/api/respond",
  "/api/plan-path",
  "/api/goal-review",
  "/api/daily-summary",
  "/api/photos",
];

/**
 * Intercept a fetch call and route to local storage if anonymous.
 * Returns null if the route should go to the server (or isn't supported locally).
 */
export async function localFetch(
  url: string,
  body: Record<string, unknown>
): Promise<Response | null> {
  // Extract pathname
  const pathname = url.startsWith("/") ? url : new URL(url).pathname;

  // Server-only routes — return null (skip, no local equivalent)
  if (SERVER_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return null;
  }

  const handler = LOCAL_ROUTES[pathname];
  if (!handler) return null;

  try {
    const data = await handler(body);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local storage error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
