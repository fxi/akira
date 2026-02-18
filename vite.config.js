import { defineConfig } from "vite";

export default defineConfig({
  base: "/akira/",
  root: "docs",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
