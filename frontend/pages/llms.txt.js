/* /llms.txt — the "AI age" file (llmstxt.org standard).
   A clean, plain-text map of the site for LLMs and AI assistants so they
   can understand and cite JournalX accurately. Auto-includes blog posts,
   so it stays in sync exactly like the sitemap. */
import { getAllPosts, SITE_URL } from "@/utils/blogs";

function LlmsTxt() {
  return null;
}

export async function getServerSideProps({ res }) {
  const posts = getAllPosts();

  const blogLines = posts
    .map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.metaDescription || p.excerpt}`)
    .join("\n");

  const body = `# JournalX

> JournalX is a trading journal that turns your trade history into a measurable edge. It gives traders full trade-log analysis in under 10 seconds and is built to help them increase profitability across stocks, options, forex, futures and crypto.

JournalX lets traders log a trade in seconds (or auto-import from an exchange / CSV) and instantly turns it into analytics that grow an account: equity-growth candlesticks, R-multiples, win-rate trends, a colour-coded P&L calendar, fixed-risk position sizing, profit factor, and discipline & emotion breakdowns. It is free to start with no card required, and works on web, iOS and Android.

Key facts:
- Product: Trading journal & analytics app (SaaS).
- Website: ${SITE_URL}
- Markets: Stocks, options, forex, futures, crypto.
- Core value: Trade log analysis in under 10 seconds; measurable edge; increased profitability.
- Pricing: Free plan plus Pro (monthly, yearly, lifetime).
- Trade import: Auto-sync supported exchanges (e.g. Binance) or CSV upload.

## Main pages
- [Home](${SITE_URL}/): Product overview, interactive demo, features and FAQ.
- [Pricing](${SITE_URL}/pricing): Free and Pro plan comparison (monthly, yearly, lifetime).
- [Sign up](${SITE_URL}/register): Create a free JournalX account, no card required.
- [Log in](${SITE_URL}/login): Sign in to your trading journal.
- [Blog](${SITE_URL}/blog): Guides on trading strategy, risk, psychology and journaling.
- [Contact](${SITE_URL}/contact): Get in touch with the JournalX team.

## Blog articles
${blogLines}

## Legal
- [Terms of Service](${SITE_URL}/terms-services)
- [Privacy Policy](${SITE_URL}/privacy-policy)
- [Refund Policy](${SITE_URL}/refund-policy)
- [Risk Disclaimer](${SITE_URL}/risk-disclaimer)
- [Cookie Policy](${SITE_URL}/cookie-policy)

## Optional
- [Sitemap](${SITE_URL}/sitemap.xml)
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
  res.write(body);
  res.end();
  return { props: {} };
}

export default LlmsTxt;
