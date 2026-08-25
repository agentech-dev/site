import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE_URL = 'https://agentech.dev';
const SITE_TITLE = 'agentech';
const SITE_DESCRIPTION = 'We build tools for agents and their teams.';

export const GET: APIRoute = async () => {
  const blog = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const pages = await getCollection('pages');

  const lines = [`# ${SITE_TITLE}`, '', `> ${SITE_DESCRIPTION}`, '', '## Pages', ''];

  for (const post of blog) {
    const d = post.data.date.toISOString().slice(0, 10);
    lines.push(`- [${post.data.title}](${SITE_URL}/blog/${post.id}.md) (${d})`);
  }

  for (const p of pages) {
    const url = p.id === 'index' ? `${SITE_URL}/index.md` : `${SITE_URL}/${p.id}.md`;
    lines.push(`- [${p.data.title}](${url})`);
  }

  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
