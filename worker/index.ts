interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const AI_BOT_RE =
  /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|Bytespider|CCBot|cohere-ai|Applebot-Extended|MistralAI)/i;

const MD_TYPE = 'text/markdown; charset=utf-8';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const ua = req.headers.get('user-agent') ?? '';
    const accept = req.headers.get('accept') ?? '';

    // 1. Direct .md request — pass through to assets.
    if (url.pathname.endsWith('.md')) {
      return withHeaders(await env.ASSETS.fetch(req), { 'Content-Type': MD_TYPE });
    }

    // 2. Known AI bot — prefer the agent-oriented .ai.md variant.
    if (AI_BOT_RE.test(ua)) {
      const aiUrl = new URL(mdPathFor(url.pathname).replace(/\.md$/, '.ai.md'), url);
      const aiResp = await env.ASSETS.fetch(new Request(aiUrl.toString(), req));
      if (aiResp.ok) {
        return withHeaders(aiResp, {
          'Content-Type': MD_TYPE,
          'Cache-Control': 'private, no-store',
          Vary: 'User-Agent',
        });
      }
      // No .ai.md — fall through and serve the markdown mirror directly.
      const mdUrl = new URL(mdPathFor(url.pathname), url);
      const mdResp = await env.ASSETS.fetch(new Request(mdUrl.toString(), req));
      if (mdResp.ok) {
        return withHeaders(mdResp, {
          'Content-Type': MD_TYPE,
          'Cache-Control': 'private, no-store',
          Vary: 'User-Agent',
        });
      }
    }

    // 3. Client explicitly accepts markdown — serve the mirror at the same URL.
    if (acceptsMarkdown(accept)) {
      const mdUrl = new URL(mdPathFor(url.pathname), url);
      const mdResp = await env.ASSETS.fetch(new Request(mdUrl.toString(), req));
      if (mdResp.ok) {
        return withHeaders(mdResp, {
          'Content-Type': MD_TYPE,
          'Cache-Control': 'no-store',
          Vary: 'Accept',
        });
      }
    }

    // 4. Default — the static HTML asset.
    return withHeaders(await env.ASSETS.fetch(req), {
      'Cache-Control': 'public, max-age=0, must-revalidate',
    });
  },
};

function mdPathFor(pathname: string): string {
  if (pathname === '/' || pathname === '') return '/index.md';
  return `${pathname.replace(/\/$/, '')}.md`;
}

function acceptsMarkdown(accept: string): boolean {
  if (!accept) return false;
  // Browsers never send text/markdown, so an explicit mention signals intent.
  return /\btext\/markdown\b/i.test(accept);
}

function withHeaders(resp: Response, extra: Record<string, string>): Response {
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!h.has(k)) h.set(k, v);
  }
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
