import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/outfit";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found in index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
    <Toaster
      theme="dark"
      position="top-center"
      richColors
      toastOptions={{ className: "font-sans" }}
    />
  </StrictMode>,
);
