import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'https://api.company-information.service.gov.uk',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Get API key from environment variable
              // loadEnv loads from .env, .env.local, .env.[mode], .env.[mode].local
              const API_KEY = env.VITE_COMPANIES_HOUSE_API_KEY || process.env.VITE_COMPANIES_HOUSE_API_KEY;

              if (!API_KEY) {
                console.error('❌ VITE_COMPANIES_HOUSE_API_KEY not set. API calls will fail.');
                console.error('Create a .env.local file with: VITE_COMPANIES_HOUSE_API_KEY=your-key');
                return;
              }

              // Add basic auth header with API key
              const auth = Buffer.from(`${API_KEY}:`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${auth}`);
              console.log('✅ API proxy configured with API key');
            });
          },
        },
      },
    },
  }
})
