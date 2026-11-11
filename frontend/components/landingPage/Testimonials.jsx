"use client";

/* Testimonials, an infinite, linear horizontal marquee of trader reviews with
   a satisfaction stat. Reusable across the landing, pricing and referral pages.

   NOTE: the testimonials and the satisfaction figures below are placeholder
   marketing copy. Replace them with real, verifiable reviews before relying on
   the structured-data rating, search engines require review markup to reflect
   genuine reviews, and the numbers here (4.8 / 1,240) intentionally match the
   site's existing SoftwareApplication schema. */

import { Star, ThumbsUp } from "lucide-react";

export const TESTIMONIALS = [
  { q: "I finally see where my losses actually come from. Cut my revenge trades to almost zero in a month.", n: "Arjun M.", r: "Futures trader" },
  { q: "The equity-growth candles are addictive, it genuinely makes me want to log every single trade.", n: "Sofia L.", r: "Crypto swing trader" },
  { q: "Quick log means I never skip a trade anymore. The discipline score completely changed how I trade.", n: "Daniel K.", r: "Options trader" },
  { q: "Passed my FTMO challenge after using the drawdown tracker to stay inside the daily limit. Game changer.", n: "Marcus T.", r: "Funded / prop trader" },
  { q: "The psychology analytics called out my tilt before I blew up an account. Worth it for that alone.", n: "Priya S.", r: "Forex day trader" },
  { q: "Logging used to take five minutes, now it's ten seconds, so my journal is finally complete.", n: "Liam O.", r: "Stocks swing trader" },
  { q: "My weekly review actually tells the truth now. R-multiples by setup showed me which strategy to drop.", n: "Chen W.", r: "Futures scalper" },
  { q: "The P&L calendar makes my month obvious at a glance. I spot bad days before they become bad weeks.", n: "Emma R.", r: "Crypto trader" },
  { q: "Auto-import from my exchange saved me hours. Everything just shows up and gets analysed instantly.", n: "Noah B.", r: "Spot & futures" },
  { q: "Seeing my win rate, payoff and expectancy together finally made position sizing make sense.", n: "Aisha K.", r: "Options income trader" },
  { q: "Honestly the cleanest journal I've tried. Fast, no clutter, and the analytics are genuinely useful.", n: "Tom H.", r: "Forex swing trader" },
  { q: "I review my emotions at entry now. Tagging FOMO and revenge trades exposed my single biggest leak.", n: "Diego F.", r: "Prop firm trader" },
];

/* Placeholder satisfaction stats, edit to your real numbers. */
export const SATISFACTION = { recommend: 96, avg: 4.8, count: 1240 };

const COLORS = {
  text: "#fff",
  muted: "#aeb4bc",
  dim: "#707a8a",
  border: "#1c1c1c",
  surface: "#0d0d0d",
  yellow: "#fcd535",
  green: "#2ebd85",
};

function Card({ t }) {
  return (
    <article className="jx-tm__card">
      <div className="jx-tm__top">
        <span className="jx-tm__stars" aria-label="5 out of 5 stars">
          {[...Array(5)].map((_, j) => (
            <Star key={j} size={13} fill={COLORS.yellow} color={COLORS.yellow} aria-hidden="true" />
          ))}
        </span>
        <span className="jx-tm__role">{t.r}</span>
      </div>
      <blockquote className="jx-tm__q">“{t.q}”</blockquote>
      <footer className="jx-tm__name">{t.n}</footer>
    </article>
  );
}

function Row({ items, reverse, dur }) {
  return (
    <div className="jx-tm__mask">
      <div className={`jx-tm__track${reverse ? " jx-tm__track--rev" : ""}`} style={{ animationDuration: `${dur}s` }}>
        <div className="jx-tm__row">{items.map((t, i) => <Card key={`a-${i}`} t={t} />)}</div>
        <div className="jx-tm__row" aria-hidden="true">{items.map((t, i) => <Card key={`b-${i}`} t={t} />)}</div>
      </div>
    </div>
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

  const half = Math.ceil(TESTIMONIALS.length / 2);
  return (
    <section id="reviews" className="jx-tm" aria-labelledby="jx-tm-title" style={{ padding: "88px 0", position: "relative", fontFamily: "Poppins, sans-serif" }}>
      <div className="jx-tm__head">
        <span className="jx-tm__kicker">Trader reviews</span>
        <h2 id="jx-tm-title" className="jx-tm__h2">What traders say about the <span>JournalX trading journal</span></h2>
        <div className="jx-tm__stats">
          <span className="jx-tm__stat">
            <span style={{ display: "inline-flex", gap: 2 }} aria-hidden="true">
              {[...Array(5)].map((_, j) => <Star key={j} size={14} fill={COLORS.yellow} color={COLORS.yellow} />)}
            </span>
            <b>{SATISFACTION.avg}/5</b> from {SATISFACTION.count.toLocaleString()}+ traders
          </span>
          <span className="jx-tm__stat"><ThumbsUp size={14} aria-hidden="true" style={{ color: COLORS.green }} /><b>{SATISFACTION.recommend}%</b> would recommend</span>
        </div>
      </div>

      <div className="jx-tm__rows">
        <Row items={TESTIMONIALS.slice(0, half)} dur={60} />
        <Row items={TESTIMONIALS.slice(half)} dur={70} reverse />
      </div>

      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      )}

      <style jsx global>{`
        .jx-tm__head { max-width: 760px; margin: 0 auto 40px; padding: 0 20px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .jx-tm__kicker { display: inline-flex; align-items: center; gap: 8px; font: 600 11.5px Poppins; letter-spacing: .14em; text-transform: uppercase; color: #c7ccd4; padding: 7px 14px; border-radius: 999px; border: 1px solid #222; background: #0b0b0d; margin-bottom: 18px; }
        .jx-tm__kicker::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #fcd535; box-shadow: 0 0 8px rgba(252,213,53,.7); }
        .jx-tm__h2 { margin: 0; font: 600 clamp(28px,3.5vw,44px)/1.1 Poppins; letter-spacing: -0.03em; color: #fff; text-wrap: balance; }
        .jx-tm__h2 span { background: linear-gradient(180deg,#f2f4f6,#8b929c); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .jx-tm__stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 18px; }
        .jx-tm__stat { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; border: 1px solid #1f1f22; background: #0c0c0e; font: 400 13px Poppins; color: #aeb4bc; }
        .jx-tm__stat b { color: #fff; font-weight: 600; }
        .jx-tm__rows { display: flex; flex-direction: column; gap: 14px; }
        .jx-tm__mask { overflow: hidden; width: 100%; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
        .jx-tm__track { display: flex; width: max-content; animation: jx-tm-scroll 60s linear infinite; }
        .jx-tm__track--rev { animation-direction: reverse; }
        .jx-tm__row { display: flex; align-items: stretch; }
        .jx-tm:hover .jx-tm__track { animation-play-state: paused; }
        .jx-tm__card { width: 330px; flex-shrink: 0; margin-right: 14px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; padding: 20px 22px; border-radius: 18px; background: linear-gradient(180deg,#0f0f11,#0a0a0b); border: 1px solid #1c1c1c; box-shadow: inset 0 1px 0 rgba(255,255,255,.05); transition: border-color .2s; }
        .jx-tm__card:hover { border-color: #2c2c2c; }
        .jx-tm__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .jx-tm__stars { display: inline-flex; gap: 2px; }
        .jx-tm__role { font: 500 11px Poppins; color: #c7ccd4; padding: 3px 9px; border-radius: 999px; border: 1px solid #262628; background: #121214; white-space: nowrap; }
        .jx-tm__q { margin: 0; font: 400 14.5px/1.6 Poppins; color: #d6dae0; flex: 1; }
        .jx-tm__name { font: 600 13.5px Poppins; color: #fff; }
        @keyframes jx-tm-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 640px) {
          .jx-tm { padding: 64px 0 !important; }
          .jx-tm__head { margin-bottom: 28px; padding: 0 16px; }
          .jx-tm__card { width: 270px; padding: 16px; gap: 10px; }
          .jx-tm__q { font-size: 13.5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .jx-tm__track { animation: none; }
          .jx-tm__mask { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
        }
      `}</style>
    </section>
  );
}
