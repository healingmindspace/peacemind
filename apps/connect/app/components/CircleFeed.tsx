"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

interface Post {
  id: string;
  text: string;
  hearts: number;
  hearted: boolean;
  time: string;
}

interface CircleFeedProps {
  circle: string;
  user: User | null;
  onBack: () => void;
}

const CIRCLE_NAMES: Record<string, { icon: string; name: string }> = {
  wellness: { icon: "🌈", name: "Wellness" },
  gratitude: { icon: "🙏", name: "Gratitude" },
  anxiety: { icon: "🌊", name: "Anxiety" },
  motivation: { icon: "💪", name: "Motivation" },
  nature: { icon: "🌿", name: "Nature" },
  sleep: { icon: "🌙", name: "Sleep" },
  books: { icon: "📚", name: "Books" },
  cooking: { icon: "🍳", name: "Cooking" },
  fitness: { icon: "🏃", name: "Fitness" },
  parenting: { icon: "👶", name: "Parenting" },
  work: { icon: "💼", name: "Work" },
  creative: { icon: "🎨", name: "Creative" },
};

// Sample posts — will be replaced with real DB posts
const SAMPLE_POSTS: Record<string, Post[]> = {
  wellness: [
    { id: "1", text: "Took a walk today and actually noticed the sky. Small win.", hearts: 3, hearted: false, time: "2h ago" },
    { id: "2", text: "Day 5 of breathing exercises. It's getting easier.", hearts: 7, hearted: false, time: "4h ago" },
  ],
  gratitude: [
    { id: "3", text: "Grateful for my morning coffee and 5 minutes of quiet.", hearts: 5, hearted: false, time: "1h ago" },
  ],
  anxiety: [
    { id: "4", text: "Had a rough morning but made it through. That counts.", hearts: 12, hearted: false, time: "3h ago" },
  ],
};

export default function CircleFeed({ circle, user, onBack }: CircleFeedProps) {
  const info = CIRCLE_NAMES[circle] || { icon: "🔵", name: circle };
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS[circle] || []);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const handleHeart = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, hearts: p.hearted ? p.hearts - 1 : p.hearts + 1, hearted: !p.hearted }
          : p
      )
    );
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    setPosting(true);
    // TODO: save to DB
    const post: Post = {
      id: crypto.randomUUID(),
      text: newPost.trim(),
      hearts: 0,
      hearted: false,
      time: "now",
    };
    setPosts([post, ...posts]);
    setNewPost("");
    setPosting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-pm-text-muted hover:text-brand cursor-pointer text-sm">
          ← Back
        </button>
        <span className="text-2xl">{info.icon}</span>
        <h2 className="text-lg font-semibold text-pm-text">{info.name}</h2>
      </div>

      {/* Post input */}
      {user ? (
        <div className="bg-pm-surface rounded-2xl p-4 mb-4 border border-pm-border">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value.slice(0, 280))}
            placeholder="Share a thought... (anonymous)"
            rows={2}
            className="w-full bg-transparent text-sm text-pm-text placeholder-pm-text-muted resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-pm-text-muted">{newPost.length}/280</span>
            <button
              onClick={handlePost}
              disabled={!newPost.trim() || posting}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-brand text-white cursor-pointer disabled:opacity-40"
            >
              Share
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-pm-surface rounded-2xl p-4 mb-4 text-center border border-pm-border">
          <p className="text-xs text-pm-text-muted">Sign in to share thoughts anonymously</p>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {posts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">{info.icon}</p>
            <p className="text-sm text-pm-text-muted">Be the first to share</p>
          </div>
        )}
        {posts.map((post) => (
          <div key={post.id} className="bg-pm-surface rounded-2xl p-4 border border-pm-border">
            <p className="text-sm text-pm-text leading-relaxed">{post.text}</p>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => handleHeart(post.id)}
                className={`flex items-center gap-1 text-xs cursor-pointer transition-all ${
                  post.hearted ? "text-red-400" : "text-pm-text-muted hover:text-red-400"
                }`}
              >
                {post.hearted ? "❤️" : "🤍"} {post.hearts > 0 && post.hearts}
              </button>
              <span className="text-xs text-pm-text-muted">{post.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
