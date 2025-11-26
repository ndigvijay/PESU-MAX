import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-icons',
      writeBundle() {
        mkdirSync('dist/icons', { recursive: true });
        copyFileSync('public/icons/manifest.json', 'dist/manifest.json');
        copyFileSync('public/icons/Pes_logo_square.png', 'dist/icons/Pes_logo_square.png');
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        background: resolve(__dirname, "src/background/background.js"),
        content: resolve(__dirname, "src/content/contentScript.jsx")
      },
      output: {
        entryFileNames: `[name]/[name].js`,
        chunkFileNames: `[name]/[name].js`,
        assetFileNames: `[name]/[name].[ext]`
      }
    }
  }
});
