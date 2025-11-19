import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path, { resolve } from "path";
import { componentTagger } from "lovable-tagger";
import sri from "rollup-plugin-sri";

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
      input: mode === 'extension' 
        ? {
            popup: resolve(__dirname, 'extension/popup/index.html'),
            options: resolve(__dirname, 'extension/options/index.html'),
            background: resolve(__dirname, 'extension/background/index.ts'),
            'content-merchant': resolve(__dirname, 'extension/content/merchant-detector.ts'),
          }
        : resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: (chunkInfo) => {
          if (mode === 'extension') {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content-merchant') {
              return '[name].js';
            }
            return 'assets/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: mode !== 'extension' ? {
          vendor: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
        } : undefined,
      },
    },
  },
}));
