import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE_URL = 'https://agentech.dev';

function stripFrontmatter(body: string): string {
  return body.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

export const GET: APIRoute = async () => {
  const blog = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const pages = await getCollection('pages');

  type Section = { url: string; title: string; date?: Date; body: string };
  const sections: Section[] = [];

  for (const p of pages) {
    const url = p.id === 'index' ? SITE_URL : `${SITE_URL}/${p.id}`;
    sections.push({
      url,
      title: p.data.title,
      body: stripFrontmatter(p.body ?? '').trim(),
    });
  }

  for (const post of blog) {
    sections.push({
      url: `${SITE_URL}/blog/${post.id}`,
      title: post.data.title,
      date: post.data.date,
      body: stripFrontmatter(post.body ?? '').trim(),
    });
  }

  const out = sections
    .map((s) => {
      const date = s.date ? `\n**Date:** ${s.date.toISOString().slice(0, 10)}\n` : '';
      return `<!-- source: ${s.url} -->\n\n# ${s.title}\n${date}\n${s.body}`;
    })
    .join('\n\n---\n\n');

  return new Response(out + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
