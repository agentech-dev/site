import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

function stripFrontmatter(body: string): string {
  return body.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

function buildMarkdown(title: string, date: Date | undefined, body: string): string {
  const dateLine = date ? `\n**Date:** ${date.toISOString().slice(0, 10)}\n` : '';
  return `# ${title}\n${dateLine}\n${stripFrontmatter(body).trim()}\n`;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const blog = await getCollection('blog');
  const pages = await getCollection('pages');
  const out: Array<{
    params: { path: string };
    props: { markdown: string };
  }> = [];

  for (const entry of blog) {
    out.push({
      params: { path: `blog/${entry.id}` },
      props: {
        markdown: buildMarkdown(entry.data.title, entry.data.date, entry.body ?? ''),
      },
    });
  }

  for (const entry of pages) {
    out.push({
      params: { path: entry.id },
      props: {
        markdown: buildMarkdown(entry.data.title, undefined, entry.body ?? ''),
      },
    });
  }

  const blogIndex = blog
    .slice()
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((p) => `- [${p.data.date.toISOString().slice(0, 10)} - ${p.data.title}](/blog/${p.id})`)
    .join('\n');
  out.push({
    params: { path: 'blog' },
    props: { markdown: `# Blog\n\n${blogIndex}\n` },
  });

  return out;
};

export const GET: APIRoute = ({ props }) => {
  const { markdown } = props as { markdown: string };
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
