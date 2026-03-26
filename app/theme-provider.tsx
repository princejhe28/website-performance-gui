"use client";

import { useEffect } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync any theme set by the anti-FOUC script into React state (nothing needed —
    // the script already set data-theme on <html> before hydration).
    // Just persist if nothing is stored yet.
    if (!localStorage.getItem("theme")) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = prefersDark ? "dark" : "light";
      localStorage.setItem("theme", theme);
      document.documentElement.dataset.theme = theme;
    }
  }, []);

  return <>{children}</>;
}
