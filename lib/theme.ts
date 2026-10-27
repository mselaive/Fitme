export type Theme = "light" | "dark" | "system";

const KEY = "fitme:theme";

export const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "system" ? t : "light";
  } catch {
    return "light";
  }
}

/** Guarda el tema y lo aplica al <html> (ver el script en app/layout.tsx). */
export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // sin almacenamiento local: solo se aplica en esta pestaña
  }
  const root = document.documentElement;
  if (theme === "light") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // Color de la barra del sistema (iOS/Android) acorde al tema visible.
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#120d0a" : "#ffffff");
}
