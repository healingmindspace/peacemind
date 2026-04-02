"use client";

import { useEffect, useState } from "react";
import { exchangeCode } from "@/lib/spotify";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SpotifyCallbackInner() {
  const [status, setStatus] = useState("Connecting to Spotify...");
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("Connection cancelled.");
      setDone(true);
      return;
    }

    if (code) {
      exchangeCode(code).then((token) => {
        if (token) {
          setStatus("Connected to Spotify!");
        } else {
          setStatus("Something went wrong. Please try again.");
        }
        setDone(true);
      });
    } else {
      setStatus("No authorization code received.");
      setDone(true);
    }
  }, [searchParams]);

  return (
    <div className="text-center px-6">
      <p className="text-3xl mb-4">🎵</p>
      <p className="text-sm text-[#5a4a7a] mb-6">{status}</p>
      {done && (
        <div className="space-y-3">
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-full bg-[#7c6a9e] text-white text-sm font-medium"
          >
            Open Heal App
          </a>
          <p className="text-xs text-[#b0a3c4]">
            If using the app from Home Screen, switch back to it — Spotify is now connected.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SpotifyCallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center">
      <Suspense fallback={<p className="text-sm text-[#8a7da0]">Loading...</p>}>
        <SpotifyCallbackInner />
      </Suspense>
    </div>
  );
}
