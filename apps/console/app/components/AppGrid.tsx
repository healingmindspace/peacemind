"use client";

interface AppCard {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  color: string;
  href: string;
  active: boolean;
}

const apps: AppCard[] = [
  {
    id: "heal",
    name: "Heal",
    icon: "🌈",
    tagline: "Mental wellness",
    color: "#7c6a9e",
    href: "/heal",
    active: true,
  },
  {
    id: "health",
    name: "Health",
    icon: "🌿",
    tagline: "Your body, understood",
    color: "#5a8a5a",
    href: "/health",
    active: true,
  },
];

export default function AppGrid() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-pm-text mb-4">Your Apps</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {apps.map((app) => (
          <a
            key={app.id}
            href={app.href}
            className="group bg-pm-surface hover:bg-pm-surface-hover rounded-2xl p-5 border border-pm-border hover:border-pm-text-muted transition-all text-center"
          >
            <span className="text-4xl block mb-3">{app.icon}</span>
            <h3 className="text-sm font-semibold text-pm-text mb-0.5">{app.name}</h3>
            <p className="text-xs text-pm-text-tertiary">{app.tagline}</p>
          </a>
        ))}

        {/* Add more apps placeholder */}
        <button
          onClick={() => {
            // Navigate to discover tab
            const event = new CustomEvent("navigate", { detail: "discover" });
            window.dispatchEvent(event);
          }}
          className="bg-pm-accent-light hover:bg-pm-accent rounded-2xl p-5 border border-dashed border-pm-border transition-all text-center cursor-pointer"
        >
          <span className="text-4xl block mb-3 opacity-30">+</span>
          <h3 className="text-sm font-medium text-pm-text-muted">Discover</h3>
          <p className="text-xs text-pm-text-muted">Find more tools</p>
        </button>
      </div>
    </div>
  );
}
