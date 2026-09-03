import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initLanguage } from "./i18n";
import "./index.css";

// Applies the stored language (and its text direction) before the first paint.
initLanguage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
