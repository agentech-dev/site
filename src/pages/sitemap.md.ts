import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE_URL = 'https://agentech.dev';

export const GET: APIRoute = async () => {
  const blog = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const pages = await getCollection('pages');

  const lines = ['# Sitemap', '', '## Pages', '', `- [Home](${SITE_URL}/)`];

  for (const p of pages) {
    if (p.id === 'index') continue;
    lines.push(`- [${p.data.title}](${SITE_URL}/${p.id})`);
  }

  lines.push('', '## Blog', '', `- [Blog index](${SITE_URL}/blog)`);
  for (const post of blog) {
    const d = post.data.date.toISOString().slice(0, 10);
    lines.push(`- [${post.data.title}](${SITE_URL}/blog/${post.id}) (${d})`);
  }

  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
