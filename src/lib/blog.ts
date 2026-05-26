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

export interface TagStat {
  name: string;
  slug: string;
  count: number;
  langs: SiteLang[];
}

export function slugifyTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function collectTagStats(posts: BlogPost[], limit?: number) {
  const stats = new Map<string, TagStat>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      const existing = stats.get(key) ?? {
        name: normalized,
        slug: slugifyTag(normalized),
        count: 0,
        langs: [],
      };
      existing.count += 1;
      if (!existing.langs.includes(post.data.lang)) existing.langs.push(post.data.lang);
      stats.set(key, existing);
    }
  }

  const sorted = [...stats.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}
