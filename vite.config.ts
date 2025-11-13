import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import sri from "rollup-plugin-sri";
import { readFileSync, writeFileSync, existsSync } from "fs";

// Custom plugin to inject build timestamp into Service Worker
const swVersionPlugin = () => ({
  name: 'sw-version-injector',
  writeBundle() {
    const swPath = 'dist/sw.js';
    if (existsSync(swPath)) {
      let content = readFileSync(swPath, 'utf-8');
      const buildTimestamp = Date.now().toString();
      content = content.replace('__BUILD_TIMESTAMP__', buildTimestamp);
      writeFileSync(swPath, content);
      console.log('✅ Service Worker version updated:', buildTimestamp);
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && sri({
      algorithms: ["sha384"],
      publicPath: "/",
    }),
    mode === "production" && swVersionPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  build: {
    rollupOptions: {
      output: {
        // Cache-busting: hashed filenames for long-term caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
        },
      },
    },
  },
}));
