const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || "";

function getRedirectUri() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/google-calendar`;
}

const SCOPES = "https://www.googleapis.com/auth/calendar.events";

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64urlencode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function loginWithGoogleCalendar() {
  const verifier = generateRandomString(128);
  const challenge = base64urlencode(await sha256(verifier));

  localStorage.setItem("gcal-verifier", verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    access_type: "offline",
    prompt: "consent",
  });

  const isPWA = window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  if (isPWA) {
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
}

export async function exchangeCode(code: string): Promise<string | null> {
  const verifier = localStorage.getItem("gcal-verifier");
  if (!verifier) return null;

  const res = await fetch("/api/gcal-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirectUri: getRedirectUri(),
      codeVerifier: verifier,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  localStorage.setItem("gcal-token", data.access_token);
  if (data.refresh_token) localStorage.setItem("gcal-refresh", data.refresh_token);
  localStorage.setItem("gcal-expires", String(Date.now() + data.expires_in * 1000));
  localStorage.removeItem("gcal-verifier");
  return data.access_token;
}

export async function getToken(): Promise<string | null> {
  const token = localStorage.getItem("gcal-token");
  const expires = localStorage.getItem("gcal-expires");

  if (token && expires && Date.now() < Number(expires)) {
    return token;
  }

  const refresh = localStorage.getItem("gcal-refresh");
  if (!refresh) return null;

  const res = await fetch("/api/gcal-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    logoutGoogleCalendar();
    return null;
  }

  const data = await res.json();
  localStorage.setItem("gcal-token", data.access_token);
  if (data.refresh_token) localStorage.setItem("gcal-refresh", data.refresh_token);
  localStorage.setItem("gcal-expires", String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

export function logoutGoogleCalendar() {
  localStorage.removeItem("gcal-token");
  localStorage.removeItem("gcal-refresh");
  localStorage.removeItem("gcal-expires");
  localStorage.removeItem("gcal-verifier");
}

export function isConnected(): boolean {
  return !!(localStorage.getItem("gcal-token") || localStorage.getItem("gcal-refresh"));
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export async function createCalendarEvent(params: {
  title: string;
  description?: string;
  startDateTime: string;
  durationMinutes: number;
}): Promise<CalendarEvent | null> {
  const token = await getToken();
  if (!token) return null;

  const start = new Date(params.startDateTime);
  const end = new Date(start.getTime() + params.durationMinutes * 60 * 1000);

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: params.title,
      description: params.description || "",
      start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok || res.status === 404;
}

export async function updateCalendarEvent(eventId: string, params: {
  title?: string;
  description?: string;
  startDateTime?: string;
  durationMinutes?: number;
}): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;

  const body: Record<string, unknown> = {};
  if (params.title) body.summary = params.title;
  if (params.description !== undefined) body.description = params.description;
  if (params.startDateTime) {
    const start = new Date(params.startDateTime);
    const end = new Date(start.getTime() + (params.durationMinutes || 30) * 60 * 1000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    body.start = { dateTime: start.toISOString(), timeZone: tz };
    body.end = { dateTime: end.toISOString(), timeZone: tz };
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export interface CalendarEventFull {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export async function getUpcomingEvents(days: number = 7): Promise<CalendarEventFull[]> {
  const token = await getToken();
  if (!token) return [];

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    maxResults: "20",
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}
