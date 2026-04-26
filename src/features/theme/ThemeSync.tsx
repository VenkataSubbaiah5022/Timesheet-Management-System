import { useLayoutEffect } from "react";
import { useThemeStore } from "./store";

export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
