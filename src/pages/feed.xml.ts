import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { Feed } from 'feed';

const SITE_URL = 'https://agentech.dev';
const SITE_TITLE = 'agentech';
const SITE_DESCRIPTION = 'We build tools for agents and their teams.';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const feed = new Feed({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    id: SITE_URL,
    link: SITE_URL,
    language: 'en',
    copyright: '',
    feedLinks: { atom: `${SITE_URL}/feed.xml` },
  });

  for (const post of posts) {
    feed.addItem({
      title: post.data.title,
      id: `${SITE_URL}/blog/${post.id}`,
      link: `${SITE_URL}/blog/${post.id}`,
      description: post.data.description,
      content: post.body ?? '',
      date: post.data.date,
    });
  }

  return new Response(feed.atom1(), {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
};
