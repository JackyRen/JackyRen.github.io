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
        {
          label: '阅读 / Read',
          items: [
            { label: 'Posts', link: '/posts/' },
            { label: 'Keywords', link: '/keywords/' },
            { label: 'About', link: '/about/' },
          ],
        },
        {
          label: '文章 / Posts',
          items: [
            {
              label: 'Hermes Kanban offload',
              items: [
                { label: '中文', link: '/posts/zh/hermes-kanban-offload-under-1gb/' },
                { label: 'English', link: '/posts/en/hermes-kanban-offload-under-1gb/' },
              ],
            },
            {
              label: 'How this blog was built',
              items: [
                { label: '中文', link: '/posts/zh/welcome-to-the-blog/' },
                { label: 'English', link: '/posts/en/welcome-to-the-blog/' },
              ],
            },
            {
              label: 'Lightweight writing system',
              items: [
                { label: '中文', link: '/posts/zh/building-a-lightweight-writing-system/' },
                { label: 'English', link: '/posts/en/building-a-lightweight-writing-system/' },
              ],
            },
          ],
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
