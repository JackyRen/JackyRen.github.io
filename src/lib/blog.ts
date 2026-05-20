import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type SiteLang = 'zh' | 'en';

export const LANG_LABELS: Record<SiteLang, string> = {
  zh: '中文',
  en: 'English',
};

export function postSlug(post: BlogPost) {
  return post.id.replace(/\.md$/, '').split('/').pop() ?? post.id;
}

export function postUrl(post: BlogPost) {
  return `/blog/${post.data.lang}/${postSlug(post)}/`;
}

export function languageRole(post: BlogPost) {
  return post.data.lang === post.data.originalLang ? 'Original' : 'Translation';
}

export function sortPosts(posts: BlogPost[]) {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function groupByCanonical(posts: BlogPost[]) {
  return posts.reduce<Record<string, BlogPost[]>>((groups, post) => {
    const key = post.data.canonicalId;
    groups[key] ??= [];
    groups[key].push(post);
    return groups;
  }, {});
}

export function findTranslation(post: BlogPost, posts: BlogPost[], lang: SiteLang) {
  return posts.find((candidate) => candidate.data.canonicalId === post.data.canonicalId && candidate.data.lang === lang);
}
