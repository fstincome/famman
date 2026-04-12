import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useThemeStore, applyTheme } from "./hooks/useTheme";

// Apply persisted theme on load
const { mode, colorName } = useThemeStore.getState();
applyTheme(mode, colorName);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
