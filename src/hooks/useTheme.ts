import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

export interface ThemeColor {
  name: string;
  label: string;
  hue: number;
  saturation: number;
}

export const themeColors: ThemeColor[] = [
  { name: "blue", label: "Bleu", hue: 210, saturation: 100 },
  { name: "indigo", label: "Indigo", hue: 234, saturation: 89 },
  { name: "violet", label: "Violet", hue: 270, saturation: 76 },
  { name: "pink", label: "Rose", hue: 330, saturation: 81 },
  { name: "red", label: "Rouge", hue: 0, saturation: 84 },
  { name: "orange", label: "Orange", hue: 25, saturation: 95 },
  { name: "amber", label: "Ambre", hue: 38, saturation: 92 },
  { name: "green", label: "Vert", hue: 142, saturation: 76 },
  { name: "teal", label: "Sarcelle", hue: 172, saturation: 66 },
  { name: "cyan", label: "Cyan", hue: 192, saturation: 91 },
];

interface ThemeState {
  mode: ThemeMode;
  colorName: string;
  setMode: (mode: ThemeMode) => void;
  setColor: (name: string) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      colorName: "blue",
      setMode: (mode) => set({ mode }),
      setColor: (colorName) => set({ colorName }),
      toggleMode: () => set((s) => ({ mode: s.mode === "light" ? "dark" : "light" })),
    }),
    { name: "famman-theme" }
  )
);

export function applyTheme(mode: ThemeMode, colorName: string) {
  const root = document.documentElement;
  const color = themeColors.find((c) => c.name === colorName) || themeColors[0];
  const h = color.hue;
  const s = color.saturation;

  // Toggle dark class
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Apply primary color scale
  root.style.setProperty("--primary", `${h} ${s}% 50%`);
  root.style.setProperty("--primary-50", `${h} ${s}% 95%`);
  root.style.setProperty("--primary-100", `${h} ${s}% 90%`);
  root.style.setProperty("--primary-200", `${h} ${s}% 80%`);
  root.style.setProperty("--primary-300", `${h} ${s}% 70%`);
  root.style.setProperty("--primary-400", `${h} ${s}% 60%`);
  root.style.setProperty("--primary-500", `${h} ${s}% 50%`);
  root.style.setProperty("--primary-600", `${h} ${s}% 40%`);
  root.style.setProperty("--primary-700", `${h} ${s}% 30%`);
  root.style.setProperty("--primary-800", `${h} ${s}% 20%`);
  root.style.setProperty("--primary-900", `${h} ${s}% 10%`);

  // Update ring & sidebar primary
  root.style.setProperty("--ring", `${h} ${s}% 50%`);
  root.style.setProperty("--sidebar-primary", `${h} ${s}% 56%`);
  root.style.setProperty("--sidebar-ring", `${h} ${s}% 56%`);

  // Gradient
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${h} ${s}% 56%), hsl(${h} ${s}% 70%))`
  );
  root.style.setProperty(
    "--shadow-primary",
    `0 4px 14px hsl(${h} ${s}% 56% / 0.25)`
  );
}
