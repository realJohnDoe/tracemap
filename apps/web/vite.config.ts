import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the build works on https://<user>.github.io/tracemap/ and on any other path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
