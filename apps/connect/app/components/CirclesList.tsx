"use client";

const CIRCLES = [
  { id: "wellness", icon: "🌈", name: "Wellness", description: "Mental health, self-care, feelings" },
  { id: "gratitude", icon: "🙏", name: "Gratitude", description: "What you're thankful for today" },
  { id: "anxiety", icon: "🌊", name: "Anxiety", description: "You're not alone in this" },
  { id: "motivation", icon: "💪", name: "Motivation", description: "Small wins and encouragement" },
  { id: "nature", icon: "🌿", name: "Nature", description: "Outdoors, walks, fresh air" },
  { id: "sleep", icon: "🌙", name: "Sleep", description: "Rest, recovery, bedtime routines" },
  { id: "books", icon: "📚", name: "Books", description: "What you're reading" },
  { id: "cooking", icon: "🍳", name: "Cooking", description: "Recipes, comfort food, meals" },
  { id: "fitness", icon: "🏃", name: "Fitness", description: "Movement, exercise, body goals" },
  { id: "parenting", icon: "👶", name: "Parenting", description: "Joys and challenges of raising kids" },
  { id: "work", icon: "💼", name: "Work", description: "Career, burnout, wins" },
  { id: "creative", icon: "🎨", name: "Creative", description: "Art, music, writing, crafts" },
];

interface CirclesListProps {
  onSelectCircle: (id: string) => void;
}

export default function CirclesList({ onSelectCircle }: CirclesListProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-pm-text mb-3">Join a Circle</h2>
      <p className="text-xs text-pm-text-tertiary mb-4">
        Share thoughts anonymously. No names, no profiles — just your words and your avatar.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CIRCLES.map((circle) => (
          <button
            key={circle.id}
            onClick={() => onSelectCircle(circle.id)}
            className="bg-pm-surface hover:bg-pm-surface-hover rounded-2xl p-4 text-left transition-all cursor-pointer border border-pm-border hover:border-pm-text-muted"
          >
            <span className="text-2xl block mb-2">{circle.icon}</span>
            <h3 className="text-sm font-semibold text-pm-text">{circle.name}</h3>
            <p className="text-xs text-pm-text-tertiary mt-0.5">{circle.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
