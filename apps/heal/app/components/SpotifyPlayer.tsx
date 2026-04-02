"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  loginWithSpotify,
  getToken,
  logoutSpotify,
  getUserPlaylists,
  type SpotifyPlaylist,
} from "@/lib/spotify";

function parseSpotifyEmbed(url: string): string | null {
  const match = url.match(
    /open\.spotify\.com\/(playlist|track|album|episode)\/([a-zA-Z0-9]+)/
  );
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }
  if (url.includes("open.spotify.com/embed")) return url;
  return null;
}

function getSpotifyDeepLink(url: string): string {
  // Convert web URL to spotify:// URI for app deep-link
  const match = url.match(
    /open\.spotify\.com\/(playlist|track|album|episode)\/([a-zA-Z0-9]+)/
  );
  if (match) return `spotify:${match[1]}:${match[2]}`;
  return url;
}

interface HistoryItem {
  url: string;
  type: string;
  id: string;
  name?: string;
}

async function fetchSpotifyName(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    );
    if (res.ok) {
      const data = await res.json();
      return data.title || null;
    }
  } catch {}
  return null;
}

const SUGGESTED_PLAYLISTS = [
  { name: "Peaceful Piano", url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO", icon: "🎹" },
  { name: "Deep Sleep", url: "https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp", icon: "🌙" },
  { name: "Nature Sounds", url: "https://open.spotify.com/playlist/37i9dQZF1DX4PP3DA4J0N8", icon: "🌿" },
  { name: "Meditation Music", url: "https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u", icon: "🧘" },
  { name: "Calm Vibes", url: "https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY", icon: "☁️" },
  { name: "Lo-Fi Beats", url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn", icon: "🎧" },
];

export default function SpotifyPlayer({ compact }: { compact?: boolean }) {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyEmbed, setSpotifyEmbed] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [connected, setConnected] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const { user, accessToken } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { t, lang } = useI18n();

  // Stop music on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    // Load current URL
    const saved = localStorage.getItem("spotify-url");
    if (saved) {
      setSpotifyUrl(saved);
      const embed = parseSpotifyEmbed(saved);
      if (embed) setSpotifyEmbed(embed);
    }

    // Auth + load history
    if (user) {
      loadHistoryFromDb(user.id);
    } else {
      loadHistoryFromLocal();
    }

    getToken().then((token) => setConnected(!!token));
  }, [user]);

  const loadHistoryFromLocal = () => {
    const savedHistory = localStorage.getItem("spotify-history");
    if (savedHistory) {
      const parsed: HistoryItem[] = JSON.parse(savedHistory);
      setHistory(parsed);
      backfillNames(parsed);
    }
  };

  const loadHistoryFromDb = async (userId: string) => {
    if (!accessToken) return;
    const res = await fetch("/api/spotify-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", userId, accessToken }),
    });
    const json = await res.json();
    const data = json.data;

    if (data && data.length > 0) {
      const items: HistoryItem[] = data.map((d: { spotify_url: string; spotify_type: string; spotify_id: string; name?: string }) => ({
        url: d.spotify_url,
        type: d.spotify_type,
        id: d.spotify_id,
        name: d.name || undefined,
      }));
      setHistory(items);
      localStorage.setItem("spotify-history", JSON.stringify(items));
      backfillNames(items);
    } else {
      // Migrate from localStorage if DB is empty
      loadHistoryFromLocal();
    }
  };

  const backfillNames = (items: HistoryItem[]) => {
    const needsName = items.filter((h) => !h.name);
    if (needsName.length > 0) {
      Promise.all(
        needsName.map(async (h) => {
          const name = await fetchSpotifyName(h.url);
          return { ...h, name: name || undefined };
        })
      ).then((updated) => {
        const merged = items.map((h) => {
          const found = updated.find((u) => u.id === h.id);
          return found || h;
        });
        setHistory(merged);
        localStorage.setItem("spotify-history", JSON.stringify(merged));
      });
    }
  };

  const addToHistory = async (url: string, name?: string) => {
    const match = url.match(
      /open\.spotify\.com\/(playlist|track|album|episode)\/([a-zA-Z0-9]+)/
    );
    if (!match) return;
    const type = match[1];
    const id = match[2];
    const exists = history.find((h) => h.id === id);
    if (exists) return;
    const fetchedName = name || (await fetchSpotifyName(url));
    const item = { url, type, id, name: fetchedName || undefined };
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("spotify-history", JSON.stringify(updated));

    // Save to DB
    if (user && accessToken) {
      fetch("/api/spotify-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "insert", userId: user.id, accessToken, spotifyUrl: url, spotifyType: type, spotifyId: id, name: fetchedName || null }),
      });
    }
  };

  const save = () => {
    const embed = parseSpotifyEmbed(spotifyUrl);
    if (embed) {
      setSpotifyEmbed(embed);
      localStorage.setItem("spotify-url", spotifyUrl);
      addToHistory(spotifyUrl);
      setShowInput(false);
      setShowHistory(false);
      setShowPlaylists(false);
    }
  };

  const selectPlaylist = (playlist: SpotifyPlaylist) => {
    const url = playlist.external_urls.spotify;
    const embed = parseSpotifyEmbed(url);
    if (embed) {
      setSpotifyUrl(url);
      setSpotifyEmbed(embed);
      localStorage.setItem("spotify-url", url);
      addToHistory(url, playlist.name);
      setShowPlaylists(false);
      setShowInput(false);
      setShowHistory(false);
    }
  };

  const [playlistError, setPlaylistError] = useState("");

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    setPlaylistError("");
    try {
      const token = await getToken();
      if (!token) {
        setConnected(false);
        setLoadingPlaylists(false);
        setPlaylistError(lang === "zh" ? "请重新连接 Spotify" : "Please reconnect Spotify");
        return;
      }
      const lists = await getUserPlaylists();
      if (lists.length === 0) {
        setPlaylistError(lang === "zh" ? "未找到播放列表" : "No playlists found");
        setLoadingPlaylists(false);
        setShowPlaylists(true);
        return;
      }
      setPlaylists(lists);
      setShowPlaylists(true);
    } catch {
      setPlaylistError(lang === "zh" ? "加载失败，请重新连接" : "Failed to load. Please reconnect.");
      setConnected(false);
    }
    setLoadingPlaylists(false);
  };

  const loadFromHistory = (item: HistoryItem) => {
    const embed = parseSpotifyEmbed(item.url);
    if (embed) {
      setSpotifyUrl(item.url);
      setSpotifyEmbed(embed);
      localStorage.setItem("spotify-url", item.url);
      setShowInput(false);
      setShowHistory(false);
      setShowPlaylists(false);
    }
  };

  const removeFromHistory = async (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("spotify-history", JSON.stringify(updated));

    if (user && accessToken) {
      fetch("/api/spotify-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", userId: user.id, accessToken, spotifyId: id }),
      });
    }
  };

  const remove = () => {
    setSpotifyEmbed(null);
    setSpotifyUrl("");
    localStorage.removeItem("spotify-url");
  };

  const handleDisconnect = () => {
    logoutSpotify();
    setConnected(false);
    setPlaylists([]);
    setShowPlaylists(false);
  };

  const openInSpotify = (url?: string) => {
    const target = url || spotifyUrl;
    if (!target) return;
    // Use universal link — works on iOS, opens app if installed, web if not
    window.open(target, "_blank");
  };

  // Active player view
  if (spotifyEmbed && !showInput && !showPlaylists) {
    return (
      <div className="max-w-sm md:max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-pm-text">🎵 {t("spotify.title")}</h3>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => openInSpotify()}
              className="text-xs text-[#1DB954] hover:text-[#1ed760] cursor-pointer font-medium"
            >
              {lang === "zh" ? "▶ 在Spotify播放" : "▶ Play in Spotify"}
            </button>
            {history.length > 1 && (
              <button
                onClick={() => { setShowHistory(!showHistory); setShowPlaylists(false); }}
                className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
              >
                {showHistory ? (lang === "zh" ? "收起" : "hide") : (lang === "zh" ? "历史" : "history")}
              </button>
            )}
            <button
              onClick={() => { setSpotifyUrl(""); setShowInput(true); setShowHistory(false); setShowPlaylists(false); }}
              className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {t("spotify.change")}
            </button>
            <button
              onClick={remove}
              className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer"
            >
              {t("spotify.remove")}
            </button>
          </div>
        </div>
        {showHistory && history.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {history.map((item) => (
              <div key={item.id} className="flex items-center">
                <button
                  onClick={() => loadFromHistory(item)}
                  className={`px-2.5 py-1 rounded-full rounded-r-none text-xs cursor-pointer transition-all ${
                    spotifyUrl.includes(item.id)
                      ? "bg-brand text-white"
                      : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                  }`}
                >
                  {item.type === "playlist" ? "📋" : item.type === "album" ? "💿" : "🎵"} {item.name || `...${item.id.slice(-4)}`}
                </button>
                <button
                  onClick={() => removeFromHistory(item.id)}
                  className={`px-1 py-1 rounded-full rounded-l-none text-xs cursor-pointer ${
                    spotifyUrl.includes(item.id)
                      ? "bg-brand text-white/60 hover:text-white"
                      : "bg-pm-surface-active text-pm-text-muted hover:text-red-400"
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={spotifyEmbed}
          width="100%"
          height={compact ? "80" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-2xl"
        />
      </div>
    );
  }

  // Playlist browser view
  if (showPlaylists) {
    return (
      <div className="max-w-sm md:max-w-lg mx-auto bg-pm-surface backdrop-blur-sm rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-pm-text">
            {lang === "zh" ? "我的播放列表" : "My Playlists"}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPlaylists(false)}
              className="text-xs text-pm-text-muted hover:text-brand cursor-pointer"
            >
              {t("auth.cancel")}
            </button>
            <button
              onClick={handleDisconnect}
              className="text-xs text-pm-text-muted hover:text-red-400 cursor-pointer"
            >
              {lang === "zh" ? "断开" : "disconnect"}
            </button>
          </div>
        </div>
        {playlistError && (
          <div className="text-center py-3">
            <p className="text-xs text-red-400 mb-2">{playlistError}</p>
            <button
              onClick={loginWithSpotify}
              className="text-xs text-brand cursor-pointer font-medium"
            >
              {lang === "zh" ? "重新连接" : "Reconnect"}
            </button>
          </div>
        )}
        {loadingPlaylists ? (
          <p className="text-xs text-pm-text-tertiary text-center py-4">
            {lang === "zh" ? "加载中..." : "Loading..."}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {playlists.map((pl) => (
              <div key={pl.id} className="flex items-center gap-2">
                <button
                  onClick={() => selectPlaylist(pl)}
                  className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-pm-surface-active transition-colors cursor-pointer text-left"
                >
                  {pl.images?.[0] ? (
                    <img
                      src={pl.images[0].url}
                      alt={pl.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-pm-accent flex items-center justify-center text-lg">
                      🎵
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-pm-text font-medium truncate">{pl.name}</p>
                    <p className="text-xs text-pm-text-tertiary">{pl.tracks.total} {lang === "zh" ? "首" : "tracks"}</p>
                  </div>
                </button>
                <button
                  onClick={() => openInSpotify(pl.external_urls.spotify)}
                  className="text-xs text-[#1DB954] hover:text-[#1ed760] cursor-pointer px-2"
                  title={lang === "zh" ? "在Spotify打开" : "Open in Spotify"}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Connect / paste URL view
  return (
    <div className="max-w-sm md:max-w-lg mx-auto bg-pm-surface backdrop-blur-sm rounded-2xl p-4 text-center">
      {showInput ? (
        <div>
          <p className="text-xs text-pm-text-tertiary mb-3">{t("spotify.paste")}</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="https://open.spotify.com/playlist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 pr-7 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-xs placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light"
              />
              {spotifyUrl && (
                <button
                  onClick={() => setSpotifyUrl("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-pm-text-muted hover:text-pm-text-secondary cursor-pointer text-xs"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={save}
              className="px-3 py-2 rounded-xl bg-brand text-white text-xs cursor-pointer"
            >
              {t("journal.save")}
            </button>
          </div>
          {history.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-pm-text-tertiary mb-2">
                {lang === "zh" ? "最近播放" : "Recent"}
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <button
                      onClick={() => loadFromHistory(item)}
                      className="px-2.5 py-1 rounded-full rounded-r-none text-xs bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer"
                    >
                      {item.type === "playlist" ? "📋" : item.type === "album" ? "💿" : "🎵"} {item.name || `...${item.id.slice(-4)}`}
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="px-1 py-1 rounded-full rounded-l-none text-xs bg-pm-surface-active text-pm-text-muted hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowInput(false)}
            className="mt-2 text-xs text-pm-text-muted cursor-pointer"
          >
            {t("auth.cancel")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setShowInput(true)}
            className="text-sm font-medium text-brand cursor-pointer"
          >
            🎵 {lang === "zh" ? "添加 Spotify" : "Add Spotify"}
          </button>
          {/* Suggested playlists */}
          <div>
            <p className="text-xs text-pm-text-tertiary mb-2">
              {lang === "zh" ? "推荐冥想音乐" : "Suggested meditation music"}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SUGGESTED_PLAYLISTS.map((pl) => (
                <button
                  key={pl.url}
                  onClick={() => {
                    const embed = parseSpotifyEmbed(pl.url);
                    if (embed) {
                      setSpotifyUrl(pl.url);
                      setSpotifyEmbed(embed);
                      localStorage.setItem("spotify-url", pl.url);
                      addToHistory(pl.url, pl.name);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer transition-all"
                >
                  {pl.icon} {pl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
