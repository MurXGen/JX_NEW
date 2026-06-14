"use client";

/* /blog/[slug] — public article. Full SEO (meta, OG, Twitter,
   BlogPosting JSON-LD, canonical). Static generation via
   getStaticPaths/getStaticProps so each article is crawlable. */

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Copy, Share2 } from "lucide-react";
import {
  BlogBody,
  BlogCTA,
  BlogTopbar,
  HelpfulRow,
} from "@/components/blog/BlogChrome";
import {
  SITE_URL,
  articleJsonLd,
  fmtDate,
  getAllPosts,
  getAuthor,
  getPostBySlug,
  getRelatedPosts,
} from "@/utils/blogs";

export async function getStaticPaths() {
  return {
    paths: getAllPosts().map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { notFound: true };
  return { props: { post, related: getRelatedPosts(params.slug) } };
}

export default function BlogPost({ post, related }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const author = getAuthor(post);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const headings = post.body.filter((b) => b.type === "h2").map((b) => b.text);

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>
      <Head>
        <title>{post.metaTitle || `${post.title} — JournalX`}</title>
        <meta name="description" content={post.metaDescription || post.excerpt} />
        <meta name="keywords" content={(post.keywords || []).join(", ")} />
        <meta name="author" content={author.name} />
        <link rel="canonical" href={url} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={author.name} />
        <meta property="article:section" content={post.category} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.metaTitle || post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/JournalX_Banner.png`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
                { "@type": "ListItem", position: 3, name: post.category, item: `${SITE_URL}/blog?category=${encodeURIComponent(post.category)}` },
                { "@type": "ListItem", position: 4, name: post.title, item: url },
              ],
            }),
          }}
        />
        {post.faqs?.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: post.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        )}
        {post.reviews?.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: post.title,
                itemListElement: post.reviews.map((rv, idx) => ({
                  "@type": "ListItem",
                  position: idx + 1,
                  item: {
                    "@type": "Review",
                    name: `${rv.name} — editorial review`,
                    itemReviewed: {
                      "@type": "SoftwareApplication",
                      name: rv.name,
                      applicationCategory: "FinanceApplication",
                      operatingSystem: "Web",
                    },
                    reviewRating: {
                      "@type": "Rating",
                      ratingValue: rv.rating,
                      bestRating: 5,
                      worstRating: 1,
                    },
                    author: { "@type": "Organization", name: "JournalX" },
                    reviewBody: rv.note || "",
                  },
                })),
              }),
            }}
          />
        )}
      </Head>

      <div style={{ minHeight: "100vh", background: "var(--color-bg-canvas)", fontFamily: "var(--jx-font)", color: "var(--color-text-primary)" }}>
        <BlogTopbar />

        <main style={{ maxWidth: 920, margin: "0 auto", padding: "var(--space-8) var(--space-4) 96px", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--text-small)", color: "var(--color-text-muted)" }}>
            <Link href="/blog" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <ArrowLeft size={14} /> Blog
            </Link>
            <ChevronRight size={13} />
            <span>{post.category}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span className="jx-badge jx-badge--brand">{post.category.toUpperCase()}</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
              {post.minutes} min read · {fmtDate(post.date)}
            </span>
          </div>

          <h1 style={{ font: "var(--text-h1)", margin: 0 }}>{post.title}</h1>

          {/* SEO lead — uses the meta description as an intro paragraph */}
          {(post.metaDescription || post.excerpt) && (
            <p style={{ font: "var(--text-body-lg)", color: "var(--color-text-muted)", margin: 0 }}>
              {post.metaDescription || post.excerpt}
            </p>
          )}

          {/* author + share */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-primary-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {author.name[0]}
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{author.name}</strong>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>{author.role}</span>
            </span>
            <button className="jx-btn jx-btn--outline jx-btn--sm" style={{ marginLeft: "auto" }} onClick={share}>
              {copied ? <><Check size={14} /> Copied</> : <><Share2 size={14} /> Share</>}
            </button>
          </div>

          {/* accent divider (replaces the cover image) */}
          <div style={{ height: 5, borderRadius: 999, background: "linear-gradient(90deg, var(--yellow-500), var(--color-success))", margin: "var(--space-2) 0" }} />

          {/* body + TOC */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: "var(--space-6)", alignItems: "start" }} className="jx-blog-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <BlogBody body={post.body} />

              {post.faqs?.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                  <h2 style={{ font: "var(--text-h2)", color: "var(--color-text-primary)", margin: 0 }}>Frequently asked questions</h2>
                  {post.faqs.map((f) => (
                    <div key={f.q} className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
                      <h3 style={{ font: "var(--text-body-md)", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 6px" }}>{f.q}</h3>
                      <p style={{ font: "var(--text-body)", color: "var(--color-text-secondary)", margin: 0 }}>{f.a}</p>
                    </div>
                  ))}
                </section>
              )}

              <HelpfulRow helpful={post.helpful} />
              {post.tags?.length > 0 && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {post.tags.map((t) => <span key={t} className="jx-chip" style={{ cursor: "default", padding: "4px 12px" }}>{t}</span>)}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", position: "sticky", top: 80 }}>
              {headings.length > 0 && (
                <div className="jx-card jx-card--flat" style={{ padding: "var(--space-4)" }}>
                  <span className="jx-sidebar__section" style={{ padding: 0 }}>On this page</span>
                  {headings.map((h, i) => (
                    <div key={h} style={{ font: i === 0 ? "var(--text-body-md)" : "var(--text-small)", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "var(--color-text-primary)" : "var(--color-text-muted)", padding: "4px 0" }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
              <a href="/register" style={{ textDecoration: "none" }}>
                <div className="jx-banner jx-banner--warn" style={{ alignItems: "flex-start", cursor: "pointer" }}>
                  <span style={{ font: "var(--text-caption)" }}>
                    <strong>Try JournalX free</strong><br />
                    Log this lesson on your next trade.
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* CTA */}
          <BlogCTA />

          {/* related */}
          {related?.length > 0 && (
            <>
              <span className="jx-card__title">Keep reading</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="jx-card jx-card--flat" style={{ padding: 0, overflow: "hidden", cursor: "pointer", height: "100%" }}>
                      <div style={{ height: 5, background: "linear-gradient(90deg, var(--yellow-500), var(--color-success))" }} />
                      <div style={{ padding: "var(--space-4)" }}>
                        <span className="jx-badge jx-badge--neutral">{p.category}</span>
                        <div style={{ font: "var(--text-body-md)", fontWeight: 600, marginTop: 8 }}>{p.title}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .jx-blog-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
