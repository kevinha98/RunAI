// Shared UI utilities and constants
// Platform-specific components live in apps/web and apps/mobile

export const COLORS = {
  primary: "#22c55e",
  primaryDark: "#16a34a",
  accent: "#84cc16",
  background: "#0a0a0a",
  card: "#141414",
  border: "#1f1f1f",
  muted: "#1a1a1a",
  mutedForeground: "#71717a",
  foreground: "#fafafa",
  destructive: "#ef4444",
} as const;

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
