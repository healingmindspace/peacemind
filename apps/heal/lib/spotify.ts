const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

function getRedirectUri() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/spotify`;
}
const SCOPES = "playlist-read-private playlist-read-collaborative user-library-read";

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

export async function loginWithSpotify() {
  const verifier = generateRandomString(128);
  const challenge = base64urlencode(await sha256(verifier));

  localStorage.setItem("spotify-verifier", verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  const isPWA = window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

  const url = `https://accounts.spotify.com/authorize?${params}`;

  if (isPWA) {
    // Open in Safari so OAuth redirect works
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
}

export async function exchangeCode(code: string): Promise<string | null> {
  const verifier = localStorage.getItem("spotify-verifier");
  if (!verifier) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  localStorage.setItem("spotify-token", data.access_token);
  localStorage.setItem("spotify-refresh", data.refresh_token);
  localStorage.setItem("spotify-expires", String(Date.now() + data.expires_in * 1000));
  localStorage.removeItem("spotify-verifier");
  return data.access_token;
}

export async function getToken(): Promise<string | null> {
  const token = localStorage.getItem("spotify-token");
  const expires = localStorage.getItem("spotify-expires");

  if (token && expires && Date.now() < Number(expires)) {
    return token;
  }

  // Try refresh
  const refresh = localStorage.getItem("spotify-refresh");
  if (!refresh) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });

  if (!res.ok) {
    logoutSpotify();
    return null;
  }

  const data = await res.json();
  localStorage.setItem("spotify-token", data.access_token);
  if (data.refresh_token) localStorage.setItem("spotify-refresh", data.refresh_token);
  localStorage.setItem("spotify-expires", String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

export function logoutSpotify() {
  localStorage.removeItem("spotify-token");
  localStorage.removeItem("spotify-refresh");
  localStorage.removeItem("spotify-expires");
  localStorage.removeItem("spotify-verifier");
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  uri: string;
  external_urls: { spotify: string };
  tracks: { total: number };
}

export async function getUserPlaylists(): Promise<SpotifyPlaylist[]> {
  const token = await getToken();
  if (!token) return [];

  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}
