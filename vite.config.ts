import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  base: "./",
  build: {
    // ปรับเพดาน warning (หน่วยเป็น kB) — ของคุณไฟล์หลัก ~1621kB
    chunkSizeWarningLimit: 2000,

  },
});