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
    // Aliases listed most-specific first so Vite matches them in the right order.
    // This preserves backward-compatible imports after the feature-based folder restructure.
    alias: [
      // ── Feature-specific component redirects ─────────────────────────────
      { find: '@/components/auth',         replacement: path.resolve(__dirname, './src/features/auth/components') },
      { find: '@/components/credit-cards', replacement: path.resolve(__dirname, './src/features/credit-cards/components') },
      { find: '@/components/receipts',     replacement: path.resolve(__dirname, './src/features/receipts/components') },
      { find: '@/components/settings',     replacement: path.resolve(__dirname, './src/features/settings/components') },
      // ── Shared component / hook / lib redirects ───────────────────────────
      { find: '@/components',              replacement: path.resolve(__dirname, './src/shared/components') },
      // ── Feature-specific hook redirects ───────────────────────────────────
      { find: '@/hooks/useAuth',           replacement: path.resolve(__dirname, './src/features/auth/hooks/useAuth') },
      { find: '@/hooks/useUserRole',       replacement: path.resolve(__dirname, './src/features/auth/hooks/useUserRole') },
      { find: '@/hooks/useDataExport',     replacement: path.resolve(__dirname, './src/features/settings/hooks/useDataExport') },
      { find: '@/hooks/useGPSTracking',    replacement: path.resolve(__dirname, './src/features/location/hooks/useGPSTracking') },
      { find: '@/hooks',                   replacement: path.resolve(__dirname, './src/shared/hooks') },
      // ── Lib redirect ──────────────────────────────────────────────────────
      { find: '@/lib',                     replacement: path.resolve(__dirname, './src/shared/lib') },
      // ── Root alias (must be last) ─────────────────────────────────────────
      { find: '@',                         replacement: path.resolve(__dirname, './src') },
    ],
    // Include "require" so the CommonJS plugin can resolve packages (e.g. react-day-picker)
    // that use date-fns via require() — date-fns v3 only exports "require"/"import" conditions.
    conditions: ['browser', 'module', 'require', 'import', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'date-fns', 'react-day-picker'],
  },
  build: {
    rollupOptions: {
      // onnxruntime-web is a heavy ML runtime — keep it external so the CJS
      // plugin never tries to bundle it (it loads its own WASM assets at runtime).
      external: (id) => id === 'onnxruntime-web' || id.startsWith('onnxruntime-web/'),
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
