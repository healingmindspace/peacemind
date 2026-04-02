"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { listPhotos, getSignedUrls, uploadPhotoWithName, deletePhoto, deletePhotos } from "@/lib/photos-api";
import { useI18n } from "@/lib/i18n";
import SpotifyPlayer from "./SpotifyPlayer";

interface Photo {
  url: string;
  category: string;
  storagePath?: string;
}

const defaultPhotos: Record<string, Photo[]> = {
  Nature: [
    { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1457089328109-e5d9bd499191?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1436891620584-47fd0e565afb?w=800&q=80", category: "Nature" },
    { url: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80", category: "Nature" },
  ],
};

const DEFAULT_CATEGORIES = Object.keys(defaultPhotos);

export default function RelaxTab() {
  const [category, setCategory] = useState("Nature");
  const [photoIndex, setPhotoIndex] = useState(0);
  const { user, accessToken } = useAuth();
  const [userPhotos, setUserPhotos] = useState<Record<string, Photo[]>>({});
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [photoLabel, setPhotoLabel] = useState("");
  const [hiddenPhotos, setHiddenPhotos] = useState<string[]>([]);
  const [fadeIn, setFadeIn] = useState(true);
  const [prevPhotoUrl, setPrevPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();

  // Build filtered defaults
  const filteredDefaults: Record<string, Photo[]> = {};
  for (const [cat, photos] of Object.entries(defaultPhotos)) {
    const filtered = photos.filter((p) => !hiddenPhotos.includes(p.url));
    if (filtered.length > 0) filteredDefaults[cat] = filtered;
  }

  // Merge: defaults first, then user categories
  const allPhotos: Record<string, Photo[]> = {
    ...filteredDefaults,
    ...userPhotos,
  };
  // Merge user photos into existing default categories if same name
  for (const [cat, photos] of Object.entries(userPhotos)) {
    if (filteredDefaults[cat]) {
      allPhotos[cat] = [...filteredDefaults[cat], ...photos];
    }
  }

  const categories = Object.keys(allPhotos);
  const currentPhotos = allPhotos[category] || Object.values(allPhotos)[0] || [];
  const currentPhoto = currentPhotos[photoIndex] || currentPhotos[0];
  const [autoSlide, setAutoSlide] = useState(true);

  // Crossfade on photo change
  useEffect(() => {
    if (!currentPhoto) return;
    setFadeIn(false);
    const t1 = setTimeout(() => {
      setPrevPhotoUrl(currentPhoto.url);
      setFadeIn(true);
    }, 50);
    return () => clearTimeout(t1);
  }, [photoIndex, category]);

  // Auto-slideshow: advance every 5 seconds
  useEffect(() => {
    if (!autoSlide || currentPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % currentPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoSlide, currentPhotos.length, category]);

  // Pause auto-slide on manual interaction, resume after 10s
  const pauseAutoSlide = useCallback(() => {
    setAutoSlide(false);
    const timer = setTimeout(() => setAutoSlide(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && accessToken) loadUserPhotos();
    else setUserPhotos({});
    const saved = localStorage.getItem("hidden-photos");
    if (saved) setHiddenPhotos(JSON.parse(saved));
  }, [user, accessToken]);

  const loadUserPhotos = async () => {
    if (!accessToken || !user) return;
    const files = await listPhotos(accessToken);
    const relaxFiles = files.filter((f) => !f.name.startsWith("mood-") && !f.name.startsWith("journal-"));
    if (relaxFiles.length === 0) { setUserPhotos({}); return; }

    const paths = relaxFiles.map((f) => `${user.id}/${f.name}`);
    const urls = await getSignedUrls(accessToken, paths);

    const grouped: Record<string, Photo[]> = {};
    for (const file of relaxFiles) {
      const path = `${user.id}/${file.name}`;
      const signedUrl = urls[path];
      if (!signedUrl) continue;
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const parts = nameWithoutExt.split("--");
      const cat = parts.length > 1 ? parts[0].replace(/-/g, " ") : "Nature";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ url: signedUrl, category: cat, storagePath: path });
    }
    setUserPhotos(grouped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    setPendingFile(e.target.files[0]);
    setPhotoLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!user || !accessToken || !pendingFile || !photoLabel.trim()) return;

    setUploading(true);
    const ext = pendingFile.name.split(".").pop();
    const safeLabel = photoLabel.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "-");
    const fileName = `${safeLabel}--${Date.now()}.${ext}`;

    const path = await uploadPhotoWithName(accessToken, pendingFile, fileName);

    if (path) {
      await loadUserPhotos();
      // Switch to the new category
      const cat = photoLabel.trim();
      setCategory(cat);
      setPhotoIndex(0);
    }

    setUploading(false);
    setPendingFile(null);
    setPhotoLabel("");
  };

  const removePhoto = async (photo?: Photo) => {
    const target = photo || currentPhoto;
    if (!target) return;

    if (target.storagePath) {
      if (!accessToken) return;
      await deletePhoto(accessToken, target.storagePath);
      await loadUserPhotos();
    } else {
      const updated = [...hiddenPhotos, target.url];
      setHiddenPhotos(updated);
      localStorage.setItem("hidden-photos", JSON.stringify(updated));
    }

    // Adjust view
    if (currentPhotos.length <= 1) {
      const remaining = categories.filter((c) => c !== category);
      setCategory(remaining[0] || Object.keys(defaultPhotos)[0]);
      setPhotoIndex(0);
    } else {
      setPhotoIndex((i) => Math.min(i, currentPhotos.length - 2));
    }
  };

  const hideCategory = (cat: string) => {
    // For defaults, hide all photos in category
    const defaultsInCat = defaultPhotos[cat] || [];
    if (defaultsInCat.length > 0) {
      const urls = defaultsInCat.map((p) => p.url);
      const updated = [...hiddenPhotos, ...urls];
      setHiddenPhotos(updated);
      localStorage.setItem("hidden-photos", JSON.stringify(updated));
    }
    // For user categories, delete all photos in that category
    const userInCat = userPhotos[cat] || [];
    if (userInCat.length > 0 && accessToken) {
      const paths = userInCat.map((p) => p.storagePath!).filter(Boolean);
      deletePhotos(accessToken, paths).then(() => loadUserPhotos());
    }
    if (category === cat) {
      const remaining = categories.filter((c) => c !== cat);
      setCategory(remaining[0] || "Nature");
      setPhotoIndex(0);
    }
  };

  const restoreAll = () => {
    setHiddenPhotos([]);
    localStorage.removeItem("hidden-photos");
  };

  const nextPhoto = () => {
    pauseAutoSlide();
    setPhotoIndex((i) => (i + 1) % currentPhotos.length);
  };

  const prevPhoto = () => {
    pauseAutoSlide();
    setPhotoIndex((i) => (i - 1 + currentPhotos.length) % currentPhotos.length);
  };

  const changeCategory = (cat: string) => {
    setCategory(cat);
    setPhotoIndex(0);
  };

  const isUserCategory = (cat: string) => !DEFAULT_CATEGORIES.includes(cat);

  return (
    <section className="py-4 px-4">
      {/* Category picker */}
      <div className="flex justify-center gap-2 flex-wrap mb-4">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center">
            <button
              onClick={() => changeCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer rounded-r-none pr-1.5 ${
                category === cat
                  ? "bg-brand text-white"
                  : "bg-pm-surface-active text-pm-text-secondary"
              }`}
            >
              {isUserCategory(cat) ? `📷 ${cat}` : cat}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); hideCategory(cat); }}
              className={`px-1.5 py-1.5 rounded-full rounded-l-none text-xs cursor-pointer ${
                category === cat
                  ? "bg-brand text-white/60 hover:text-white"
                  : "bg-pm-surface-active text-pm-text-muted hover:text-red-400"
              }`}
            >
              ×
            </button>
          </div>
        ))}
        {user && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer hover:bg-pm-surface-hover transition-all disabled:opacity-40"
          >
            {uploading ? "..." : t("relax.add")}
          </button>
        )}
        {hiddenPhotos.length > 0 && (
          <button
            onClick={restoreAll}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-tertiary cursor-pointer hover:bg-pm-surface-hover transition-all"
          >
            {t("relax.restoreAll")}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Label photo dialog */}
      {pendingFile && (
        <div className="max-w-sm mx-auto mb-4 bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-pm-text mb-1">{t("relax.label")}</p>
          <p className="text-xs text-pm-text-tertiary mb-3">
            {t("relax.labelHint")}
          </p>
          <input
            type="text"
            placeholder={t("relax.labelPlaceholder")}
            value={photoLabel}
            onChange={(e) => setPhotoLabel(e.target.value)}
            autoFocus
            className="w-full px-4 py-2 rounded-xl bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light mb-3"
          />
          <div className="flex justify-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || !photoLabel.trim()}
              className="px-5 py-2 rounded-full text-xs font-medium bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              {uploading ? t("relax.uploading") : t("journal.save")}
            </button>
            <button
              onClick={() => { setPendingFile(null); setPhotoLabel(""); }}
              className="px-5 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer"
            >
              {t("auth.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Photo display */}
      {currentPhoto && (
        <div className="relative max-w-sm md:max-w-lg mx-auto rounded-2xl overflow-hidden shadow-lg h-96 md:h-[28rem]">
          {/* Previous photo (fading out) */}
          {prevPhotoUrl && prevPhotoUrl !== currentPhoto.url && (
            <img
              src={prevPhotoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Current photo (fading in) */}
          <img
            src={currentPhoto.url}
            alt={currentPhoto.category}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${fadeIn ? "opacity-100" : "opacity-0"}`}
          />
          {/* Delete/hide button */}
          <button
            onClick={() => removePhoto()}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 text-white/70 hover:text-red-300 flex items-center justify-center cursor-pointer text-xs"
          >
            ×
          </button>
          {currentPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center cursor-pointer"
              >
                ‹
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center cursor-pointer"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

      {/* Photo dots */}
      {currentPhotos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {currentPhotos.map((_, i) => (
            <button
              key={i}
              onClick={() => { pauseAutoSlide(); setPhotoIndex(i); }}
              className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                i === photoIndex ? "bg-brand w-4" : "bg-pm-border"
              }`}
            />
          ))}
        </div>
      )}

      {/* Spotify */}
      <div className="mt-4">
        <SpotifyPlayer compact />
      </div>

      {!user && (
        <p className="text-center mt-4 text-xs text-pm-text-muted">
          {t("relax.signIn")}
        </p>
      )}
    </section>
  );
}
