import type { APIRoute, GetStaticPaths } from 'astro';

const aiFiles = import.meta.glob<string>('../content/**/*.ai.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function stripFrontmatter(body: string): string {
  return body.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

function routePathFor(filePath: string): string {
  const m = filePath.match(/\.\.\/content\/(pages|blog)\/(.+)\.ai\.md$/);
  if (!m) return '';
  const [, collection, slug] = m;
  return collection === 'blog' ? `blog/${slug}` : slug;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const out: Array<{
    params: { path: string };
    props: { markdown: string };
  }> = [];

  for (const [filePath, raw] of Object.entries(aiFiles)) {
    const path = routePathFor(filePath);
    if (!path) continue;
    out.push({
      params: { path },
      props: { markdown: stripFrontmatter(raw).trim() + '\n' },
    });
  }

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
