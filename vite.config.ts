/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import path from 'path'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
import { stagingBuildSettings } from './deployment/staging-build.mjs'

export default defineConfig(({ mode }) => {
  // Staging must never inherit endpoint values from local/production env files.
  const staging = mode === 'staging' ? stagingBuildSettings(process.env) : undefined
  const env = staging ? {} : loadEnv(mode, __dirname, 'VITE_')
  return {
    root: __dirname,
    envDir: staging ? false : undefined,
    cacheDir: './node_modules/.vite/TestProject',

    server: {
      port: 4200,
      host: 'localhost',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      proxy: env.VITE_API_BASE_URL
        ? {
            '/api': {
              target: env.VITE_API_BASE_URL,
              changeOrigin: false,
              rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },

    preview: {
      port: 4300,
      host: 'localhost',
    },

    plugins: [
      react(),
      nxViteTsPaths(),
      svgr(),
      tailwindcss(),
      // Custom plugin to handle WASM files
      {
        name: 'wasm-loader',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm')
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },

    build: {
      outDir: './dist/TestProject',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      assetsInlineLimit: 0, // Don't inline WASM files
      rollupOptions: {
        output: {
          // Use relative paths for CloudFront compatibility
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },

    // Base path for relative URLs (important for CloudFront)
    base: staging?.base ?? './',
    define: staging?.define,

    test: {
      watch: false,
      globals: true,
      cache: {
        dir: './node_modules/.vitest/TestProject',
      },
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

      reporters: ['default'],
      coverage: {
        reportsDirectory: './coverage/TestProject',
        provider: 'v8',
      },
    },
  }
})
