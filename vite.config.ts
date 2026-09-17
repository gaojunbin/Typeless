import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react(), {
    name: 'local-app-csp',
    transformIndexHtml(html) {
      const script = command === 'serve' ? "'self' 'unsafe-inline'" : "'self'";
      const connect = command === 'serve' ? "'self' ws://127.0.0.1:5173 ws://localhost:5173" : "'none'";
      const policy = `default-src 'none'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connect}; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'`;
      return { html, tags: [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }] };
    },
  }],
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    watch: {
      followSymlinks: false,
      ignored: /[/\\](?:\.cache|\.local|release|dist|dist-electron)(?:[/\\]|$)/,
    },
  },
  build: { outDir: 'dist' },
}));
