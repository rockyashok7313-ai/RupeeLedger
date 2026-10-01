import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "rupee_ledger_theme";
const THEME_COLORS = { light: "#8f1d1d", dark: "#1a1613" };

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage blocked: fall through to system */
  }
  return "system";
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function apply(mode: ThemeMode) {
  const resolved = resolve(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[resolved]);
}

/** Call once before React renders so the first paint is already in the right theme. */
export function applyStoredTheme() {
  apply(readStored());
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readStored);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(readStored()));

  useEffect(() => {
    apply(mode);
    setResolved(resolve(mode));
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      apply("system");
      setResolved(resolve("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* theme still applies for this session */
    }
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolve(mode) === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  return { mode, resolved, setMode, toggle };
}
