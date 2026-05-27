import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://jackyren.github.io',
  integrations: [
    starlight({
      title: 'Jacky Ren',
      description: 'Jacky Ren 的双语写作与工程笔记。',
      locales: { root: { label: '简体中文', lang: 'zh-CN' } },
      customCss: ['./src/styles/custom.css'],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/JackyRen' }],
      sidebar: [
        { label: '首页 / Home', link: '/' },
        { label: '关键词 / Keywords', link: '/keywords/' },
        { label: '关于 / About', link: '/about/' },
        {
          label: '文章 / Posts',
          items: [{ autogenerate: { directory: 'posts' } }],
        },
      ],
    }),
  ],
  vite: {
    server: {
      allowedHosts: ['hm.boxd.sh'],
    },
  },
});
