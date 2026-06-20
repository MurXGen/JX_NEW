"use client";

/* Testimonials — an infinite, linear horizontal marquee of trader reviews with
   a satisfaction stat. Reusable across the landing, pricing and referral pages.

   NOTE: the testimonials and the satisfaction figures below are placeholder
   marketing copy. Replace them with real, verifiable reviews before relying on
   the structured-data rating — search engines require review markup to reflect
   genuine reviews, and the numbers here (4.8 / 1,240) intentionally match the
   site's existing SoftwareApplication schema. */

import { Star, ThumbsUp } from "lucide-react";

export const TESTIMONIALS = [
  { q: "I finally see where my losses actually come from. Cut my revenge trades to almost zero in a month.", n: "Arjun M.", r: "Futures trader" },
  { q: "The equity-growth candles are addictive — it genuinely makes me want to log every single trade.", n: "Sofia L.", r: "Crypto swing trader" },
  { q: "Quick log means I never skip a trade anymore. The discipline score completely changed how I trade.", n: "Daniel K.", r: "Options trader" },
  { q: "Passed my FTMO challenge after using the drawdown tracker to stay inside the daily limit. Game changer.", n: "Marcus T.", r: "Funded / prop trader" },
  { q: "The psychology analytics called out my tilt before I blew up an account. Worth it for that alone.", n: "Priya S.", r: "Forex day trader" },
  { q: "Logging used to take five minutes — now it's ten seconds, so my journal is finally complete.", n: "Liam O.", r: "Stocks swing trader" },
  { q: "My weekly review actually tells the truth now. R-multiples by setup showed me which strategy to drop.", n: "Chen W.", r: "Futures scalper" },
  { q: "The P&L calendar makes my month obvious at a glance. I spot bad days before they become bad weeks.", n: "Emma R.", r: "Crypto trader" },
  { q: "Auto-import from my exchange saved me hours. Everything just shows up and gets analysed instantly.", n: "Noah B.", r: "Spot & futures" },
  { q: "Seeing my win rate, payoff and expectancy together finally made position sizing make sense.", n: "Aisha K.", r: "Options income trader" },
  { q: "Honestly the cleanest journal I've tried. Fast, no clutter, and the analytics are genuinely useful.", n: "Tom H.", r: "Forex swing trader" },
  { q: "I review my emotions at entry now. Tagging FOMO and revenge trades exposed my single biggest leak.", n: "Diego F.", r: "Prop firm trader" },
];

/* Placeholder satisfaction stats — edit to your real numbers. */
export const SATISFACTION = { recommend: 96, avg: 4.8, count: 1240 };

const COLORS = {
  text: "#fff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  border: "rgba(255,255,255,0.1)",
  surface: "rgba(22,26,32,0.6)",
  yellow: "#fcd535",
  green: "#2ebd85",
};

function Card({ t }) {
  return (
    <article
      style={{
        width: 340,
        flexShrink: 0,
        marginRight: 18,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: 24,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", gap: 3, marginBottom: 12 }} aria-label="5 out of 5 stars">
        {[...Array(5)].map((_, j) => (
          <Star key={j} size={15} fill={COLORS.yellow} color={COLORS.yellow} aria-hidden="true" />
        ))}
      </div>
      <p style={{ font: "400 15px/1.6 Poppins", color: "#d6dae0", margin: "0 0 16px" }}>“{t.q}”</p>
      <div style={{ font: "600 14px Poppins", color: COLORS.text }}>{t.n}</div>
      <div style={{ font: "400 13px Poppins", color: COLORS.dim }}>{t.r}</div>
    </article>
  );
}

export default function Testimonials({ schema = false }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "JournalX",
    description: "Trading journal and analytics for funded, prop firm, forex, futures, stock, options and crypto traders.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(SATISFACTION.avg),
      ratingCount: String(SATISFACTION.count),
      bestRating: "5",
      worstRating: "1",
    },
    review: TESTIMONIALS.slice(0, 6).map((t) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      author: { "@type": "Person", name: t.n },
      reviewBody: t.q,
    })),
  };

  return (
    <section className="jx-tm" aria-label="Customer testimonials" style={{ padding: "56px 0", position: "relative" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", textAlign: "center", marginBottom: 30 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(46,189,133,0.12)", border: "1px solid rgba(46,189,133,0.3)", color: COLORS.green, borderRadius: 999, padding: "6px 14px", font: "600 13px Poppins", marginBottom: 16 }}>
          <ThumbsUp size={14} aria-hidden="true" /> {SATISFACTION.recommend}% of traders would recommend JournalX
        </span>
        <h2 style={{ font: "700 clamp(26px,4vw,38px)/1.12 Poppins", margin: "0 0 10px", letterSpacing: "-1px", color: COLORS.text }}>
          Loved by traders building real edges
        </h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: COLORS.muted, font: "400 15px Poppins" }}>
          <span style={{ display: "inline-flex", gap: 2 }} aria-hidden="true">
            {[...Array(5)].map((_, j) => (
              <Star key={j} size={16} fill={COLORS.yellow} color={COLORS.yellow} />
            ))}
          </span>
          <strong style={{ color: COLORS.text }}>{SATISFACTION.avg}/5</strong> average · based on {SATISFACTION.count.toLocaleString()}+ traders
        </div>
      </div>

      <div className="jx-tm__mask">
        <div className="jx-tm__track">
          <div className="jx-tm__row">
            {TESTIMONIALS.map((t, i) => (
              <Card key={`a-${i}`} t={t} />
            ))}
          </div>
          <div className="jx-tm__row" aria-hidden="true">
            {TESTIMONIALS.map((t, i) => (
              <Card key={`b-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>

      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      )}

      <style jsx>{`
        .jx-tm__mask {
          overflow: hidden;
          width: 100%;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .jx-tm__track {
          display: flex;
          width: max-content;
          animation: jx-tm-scroll 55s linear infinite;
        }
        .jx-tm__row {
          display: flex;
          align-items: stretch;
        }
        .jx-tm:hover .jx-tm__track {
          animation-play-state: paused;
        }
        @keyframes jx-tm-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .jx-tm__track {
            animation: none;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
          }
          .jx-tm__mask {
            -webkit-mask-image: none;
            mask-image: none;
          }
        }
      `}</style>
    </section>
  );
}
