// /components.tsx
"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // If theme isn't resolved yet on first paint, render nothing
  if (!resolvedTheme) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
