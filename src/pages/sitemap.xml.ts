import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const SITE_URL = 'https://agentech.dev';

function lastmodFor(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', filePath],
      { encoding: 'utf8' },
    ).trim();
    if (out) return out;
  } catch {
    // Fall through to filesystem mtime.
  }
  return statSync(filePath).mtime.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const blog = await getCollection('blog');
  const pages = await getCollection('pages');

  type Entry = { url: string; lastmod?: string };
  const entries: Entry[] = [];

  for (const p of pages) {
    const url = p.id === 'index' ? SITE_URL : `${SITE_URL}/${p.id}`;
    entries.push({ url, lastmod: lastmodFor(p.filePath) });
  }

  entries.push({ url: `${SITE_URL}/blog`, lastmod: lastmodFor('src/content/blog') });

  for (const post of blog.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())) {
    entries.push({
      url: `${SITE_URL}/blog/${post.id}`,
      lastmod: post.data.date.toISOString().slice(0, 10),
    });
  }

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const e of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${e.url}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
