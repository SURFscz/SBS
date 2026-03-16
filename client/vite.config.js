import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: [
            // JS: force browser-safe build
            {
                find: /^jsondiffpatch$/,
                replacement: 'jsondiffpatch/dist/jsondiffpatch.umd.js',
            },

            // CSS: keep original path working
            {
                find: /^jsondiffpatch\/dist\/formatters-styles\/(.*)$/,
                replacement: 'jsondiffpatch/dist/formatters-styles/$1',
            },
        ],
    },
    plugins: [react()],
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 1000
    },
    server: {
      port: 3000,
      allowedHosts: true,
      proxy: {
        // Adjust the path pattern to whatever your app proxies
        '/api': {
          target: `http://${process.env.SBS_SERVER ?? 'localhost:8080'}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    },
    css: {
        preprocessorOptions: {
            scss: {
                // ToDo fix?
                silenceDeprecations: ["mixed-decls", "global-builtin", "color-functions"],
            },
        },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts', // if you have one
      transformIgnorePatterns: [
        'node_modules/(?!i18n-js)/',     // replaces --transformIgnorePatterns
      ]
    }
})
