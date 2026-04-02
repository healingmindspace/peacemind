"use client";

export default function AccountBar() {
  // TODO: Wire up shared auth from @peacemind/lib
  return (
    <button className="px-4 py-2 rounded-full text-sm font-medium bg-pm-text text-white hover:bg-pm-text-secondary transition-colors cursor-pointer">
      Sign in
    </button>
  );
}
