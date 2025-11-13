import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import sri from "rollup-plugin-sri";
import { readFileSync, writeFileSync, existsSync } from "fs";

// Custom plugin to inject version and build timestamp
const swVersionPlugin = () => ({
  name: 'sw-version-injector',
  buildStart() {
    // Update meta.json with version info
    const buildId = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', 'T');
    const timestamp = Date.now();
    
    const meta = {
      version: "1.0.1",
      buildId,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unified-login-button',
      timestamp
    };
    
    writeFileSync('public/meta.json', JSON.stringify(meta, null, 2));
    console.log('✅ meta.json updated:', meta.version, meta.buildId);
  },
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
