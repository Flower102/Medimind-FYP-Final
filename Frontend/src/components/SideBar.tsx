//   /Frontend/src/components/SideBar.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

export function SideBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ Show shell for these routes only
  // If your app pages live at /dashboard, /learning, etc, keep this.
  const shellRoutes = ["/dashboard", "/learning_workspace", "/chatbots","/chatbot_InteractionPage", "/favourites", "/progress", "/settings"];
  const useShell =
    shellRoutes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Example: if you want shell for *everything except* auth pages, use this instead:
  // const useShell = !pathname.startsWith("/auth") && pathname !== "/";

  return useShell ? <AppShell>{children}</AppShell> : <>{children}</>;
}
