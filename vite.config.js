import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/" ensures assets load correctly from root for BrowserRouter deep routes
export default defineConfig({ plugins: [react()], base: "/" });
