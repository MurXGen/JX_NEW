/* blogs.js — read helpers over data/blogs.json.
   Single source of truth for the dashboard Learn & News panel and the
   public /blog pages. Update the JSON daily and both surfaces refresh. */

import blogData from "@/data/blogs.json";

export const SITE_URL = "https://journalx.app";

export const getAuthor = (post) => post?.author || blogData.meta.defaultAuthor;
export const getCategories = () => ["All", ...blogData.categories];

export const getAllPosts = () =>
  [...blogData.posts].sort((a, b) => new Date(b.date) - new Date(a.date));

export const getFeaturedPost = () =>
  blogData.posts.find((p) => p.featured) || getAllPosts()[0];

export const getPostBySlug = (slug) =>
  blogData.posts.find((p) => p.slug === slug) || null;

export const getRelatedPosts = (slug, n = 3) => {
  const current = getPostBySlug(slug);
  if (!current) return getAllPosts().slice(0, n);
  return getAllPosts()
    .filter((p) => p.slug !== slug)
    .sort((a, b) => (b.category === current.category) - (a.category === current.category))
    .slice(0, n);
};

export const helpfulScore = (post) => {
  const h = post?.helpful || { up: 0, down: 0 };
  const total = h.up + h.down;
  return total ? Math.round((h.up / total) * 100) : null;
};

/* Article JSON-LD for SEO (schema.org/BlogPosting) */
export const articleJsonLd = (post) => {
  const author = getAuthor(post);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: `${SITE_URL}${post.cover}`,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: author.name },
    publisher: {
      "@type": "Organization",
      name: "JournalX",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/JournalX_Favicon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    keywords: (post.keywords || []).join(", "),
  };
};

export const blogListJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "JournalX Blog — Trading insights & journaling guides",
  url: `${SITE_URL}/blog`,
  blogPost: getAllPosts().map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `${SITE_URL}/blog/${p.slug}`,
    datePublished: p.date,
    author: { "@type": "Person", name: getAuthor(p).name },
  })),
});

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
