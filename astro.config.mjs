import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jackyren.github.io',
  vite: {
    server: {
      allowedHosts: ['hm.boxd.sh'],
    },
  },
});
