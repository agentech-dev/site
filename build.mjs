import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import { Feed } from "feed";

const SITE_URL = "https://agentech.dev";
const SITE_TITLE = "agentech";
const SITE_DESCRIPTION = "We build tools for agents and their teams.";

// --- Helpers ---

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractDate(content) {
  const match = content.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function extractDescription(content) {
  // First non-heading, non-empty, non-metadata line
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("**Date:") &&
      !trimmed.startsWith("---") &&
      !trimmed.startsWith("[Back to")
    ) {
      return trimmed;
    }
  }
  return "";
}

// --- Blog index ---

async function buildBlogIndex(blogPosts) {
  const lines = ["# Blog", ""];
  for (const post of blogPosts) {
    const slug = path.basename(post.file, ".md");
    lines.push(`- [${post.date} - ${post.title}](/blog/${slug})`);
  }
  lines.push("");
  await fs.writeFile("blog/index.md", lines.join("\n"));
  console.log("wrote blog/index.md");
}

// --- Sitemap ---

async function buildSitemap(pages) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const page of pages) {
    lines.push("  <url>");
    lines.push(`    <loc>${page.url}</loc>`);
    if (page.date) {
      lines.push(`    <lastmod>${page.date}</lastmod>`);
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  lines.push("");
  await fs.writeFile("sitemap.xml", lines.join("\n"));
  console.log("wrote sitemap.xml");
}

// --- RSS feed ---

async function buildFeed(blogPosts) {
  const feed = new Feed({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    id: SITE_URL,
    link: SITE_URL,
    language: "en",
    feedLinks: {
      atom: `${SITE_URL}/feed.xml`,
    },
  });

  for (const post of blogPosts) {
    const slug = path.basename(post.file, ".md");
    feed.addItem({
      title: post.title,
      id: `${SITE_URL}/blog/${slug}`,
      link: `${SITE_URL}/blog/${slug}`,
      description: post.description,
      content: post.content,
      date: new Date(post.date),
    });
  }

  await fs.writeFile("feed.xml", feed.atom1());
  console.log("wrote feed.xml");
}

// --- Redirects ---

async function buildRedirects(allFiles) {
  const lines = [];

  for (const file of allFiles) {
    const filePath = file;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ".md");

    if (base === "index") {
      // /dir/ -> /dir/index.md
      const cleanPath = dir === "." ? "/" : `/${dir}/`;
      lines.push(`${cleanPath}  /${filePath}  200`);
      // Also without trailing slash for non-root
      if (dir !== ".") {
        lines.push(`/${dir}  /${filePath}  200`);
      }
    } else {
      // /dir/slug -> /dir/slug.md
      const cleanPath = dir === "." ? `/${base}` : `/${dir}/${base}`;
      lines.push(`${cleanPath}  /${filePath}  200`);
    }
  }

  lines.push("");
  await fs.writeFile("_redirects", lines.join("\n"));
  console.log("wrote _redirects");
}

// --- Site index in index.md ---

async function buildSiteIndex(pages, blogPosts) {
  const content = await fs.readFile("index.md", "utf-8");
  const marker = "## Site index";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return;

  const above = content.slice(0, markerIndex);
  const lines = [marker, ""];

  // Blog section with nested posts
  lines.push("- [Blog](/blog/)");
  for (const post of blogPosts) {
    const slug = path.basename(post.file, ".md");
    lines.push(`  - [${post.title}](/blog/${slug})`);
  }

  // Product pages (top-level dirs that aren't blog)
  const productPages = pages.filter(
    (p) =>
      p.file.match(/^[^/]+\/index\.md$/) &&
      !p.file.startsWith("blog/"),
  );
  for (const page of productPages) {
    const dir = path.dirname(page.file);
    lines.push(`- [${page.title}](/${dir})`);
  }

  // Static links
  lines.push("- [Feed](/feed.xml)");
  lines.push("- [Contact](mailto:hello@agentech.dev)");
  lines.push("");

  await fs.writeFile("index.md", above + lines.join("\n"));
  console.log("wrote index.md (site index)");
}

// --- llms.txt and llms-full.txt ---

async function buildLlmsTxt(pages, blogPosts) {
  // llms.txt - concise overview with links to source markdown
  const lines = [
    `# ${SITE_TITLE}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Pages",
    "",
  ];

  for (const page of pages) {
    if (page.file === "blog/index.md") continue;
    const desc = page.date ? ` (${page.date})` : "";
    const mdUrl = `${SITE_URL}/${page.file}`;
    lines.push(`- [${page.title}](${mdUrl})${desc}`);
  }

  lines.push("");
  await fs.writeFile("llms.txt", lines.join("\n"));
  console.log("wrote llms.txt");
}

async function buildLlmsFullTxt(pages) {
  // llms-full.txt - all page content concatenated
  const sections = [];

  for (const page of pages) {
    if (page.file === "blog/index.md") continue;
    const content = await fs.readFile(page.file, "utf-8");
    sections.push(`<!-- source: ${page.url} -->\n\n${content.trim()}`);
  }

  await fs.writeFile("llms-full.txt", sections.join("\n\n---\n\n") + "\n");
  console.log("wrote llms-full.txt");
}

// --- Main ---

async function main() {
  // Find all markdown files (exclude README and node_modules)
  const allFiles = await fg("**/*.md", {
    ignore: ["README.md", "node_modules/**"],
  });
  allFiles.sort();

  // Read all files
  const pages = [];
  const blogPosts = [];

  for (const file of allFiles) {
    const content = await fs.readFile(file, "utf-8");
    const title = extractTitle(content) || path.basename(file, ".md");
    const date = extractDate(content);
    const description = extractDescription(content);

    const dir = path.dirname(file);
    const base = path.basename(file, ".md");
    const url =
      base === "index"
        ? dir === "."
          ? SITE_URL
          : `${SITE_URL}/${dir}`
        : dir === "."
          ? `${SITE_URL}/${base}`
          : `${SITE_URL}/${dir}/${base}`;

    pages.push({ file, title, date, url });

    if (file.startsWith("blog/") && file !== "blog/index.md") {
      blogPosts.push({ file, title, date, description, content });
    }
  }

  // Sort blog posts by date descending
  blogPosts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  await buildBlogIndex(blogPosts);
  await buildSiteIndex(pages, blogPosts);
  await buildSitemap(pages);
  await buildFeed(blogPosts);
  await buildRedirects(allFiles);
  await buildLlmsTxt(pages, blogPosts);
  await buildLlmsFullTxt(pages);
  await fs.copyFile("index.md", "README.md");
  console.log("wrote README.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
