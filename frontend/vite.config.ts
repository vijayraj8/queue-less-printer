import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Port of the existing Flask app, served by backend/server.py (see /app/backend).
const FLASK_TARGET = "http://127.0.0.1:5000";

// Flask routes are proxied at their ORIGINAL paths so the app's own absolute
// links (form action="/upload", the /download/<job_id> attachment link, ...)
// keep working when the flow is embedded through the proxy.
const FLASK_ROUTES = ["/flask", "/upload", "/configure", "/payment", "/print", "/download"];

export default defineConfig(({ mode }) => {
  // '' prefix so a non-VITE_ name (PUBLIC_APP_URL) can be read server-side here.
  // Use the project root relative to the Vite process instead of the Node global
  // to avoid relying on ambient Node typings in this TypeScript config.
  const env = loadEnv(mode, ".", "");
  const publicAppUrl = env.PUBLIC_APP_URL || "http://localhost:3000";
  const isPublicHttps = publicAppUrl.startsWith("https://");

  const proxy = Object.fromEntries(
    FLASK_ROUTES.map((route) => [
      route,
      {
        target: FLASK_TARGET,
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/flask/, "") || "/",
      },
    ]),
  );

  return {
    plugins: [tailwindcss()],
    define: {
      __PUBLIC_APP_URL__: JSON.stringify(publicAppUrl),
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      // Through the public ingress the HMR socket must travel over wss/443.
      hmr: isPublicHttps ? { protocol: "wss", clientPort: 443 } : undefined,
      proxy,
    },
  };
});
