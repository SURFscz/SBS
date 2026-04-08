import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: [
            {
                find: /^@surfnet\/sds$/,
                replacement: '@surfnet/sds/esm/index.js',
            },
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
    plugins: [
        svgr({
            svgrOptions: { exportType: "default", ref: true, svgo: false, titleProp: true },
        }),
        react(),
    ],
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 1000
    },
    server: {
      port: 3000,
      open: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: `http://${process.env.SBS_SERVER ?? 'localhost:8080'}`,
          changeOrigin: true,
        },
        '/config': {
          target: `http://${process.env.SBS_SERVER ?? 'localhost:8080'}`,
          changeOrigin: true,
        },
        '/health': {
          target: `http://${process.env.SBS_SERVER ?? 'localhost:8080'}`,
          changeOrigin: true,
        },
      }
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: '@use "vars" as *;\n',
                loadPaths: [path.resolve(__dirname, 'src/stylesheets')],
                // ToDo fix?
                silenceDeprecations: ["mixed-decls", "global-builtin", "color-functions"],
            },
        },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      transformIgnorePatterns: [
        'node_modules/(?!i18n-js)/',     // replaces --transformIgnorePatterns
      ]
    }
})
