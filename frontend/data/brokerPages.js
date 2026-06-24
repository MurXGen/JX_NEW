/* Programmatic broker landing pages (India). Same config shape as
   data/marketPages.js, so they render through components/landingPage/MarketLanding
   via the dynamic route pages/[slug].jsx. Each targets "[broker] trading journal"
   — low-competition, high-intent keywords for Indian retail traders.

   Accuracy note: Indian retail brokers are imported via CSV (tradebook / P&L /
   console export), so copy stays honest about CSV import rather than promising
   broker auto-sync. */

export const BROKER_PAGES = {
  "zerodha-trading-journal": {
    slug: "zerodha-trading-journal",
    market: "Zerodha",
    adj: "Zerodha",
    eyebrow: "For Zerodha traders",
    h1: "Zerodha trading journal & analytics",
    title: "Zerodha Trading Journal — Import Your Tradebook | JournalX",
    description:
      "Turn your Zerodha trades into real analytics. Import your Console tradebook/P&L as a CSV, then track win rate, R-multiples, drawdown and psychology across equity, F&O and intraday.",
    keywords: [
      "zerodha trading journal", "zerodha journal app", "zerodha tradebook analysis",
      "zerodha p&l analysis", "trading journal for zerodha", "kite trading journal",
      "intraday trading journal india",
    ],
    intro:
      "Zerodha shows you what you traded, not why you win or lose. Export your tradebook or P&L from Console, import it into JournalX, and get the win rate, R-multiples, drawdown and psychology breakdowns Kite and Console don't give you.",
    extra: { icon: "target", title: "Built for Indian F&O & intraday", body: "Track options, futures and intraday separately, with per-setup and per-session analytics tuned to NSE/BSE hours." },
    faqs: [
      ["How do I import my Zerodha trades?", "Export your tradebook or P&L statement from Zerodha Console as a CSV/Excel file, then upload it to JournalX with our import template. Your full history flows straight into your analytics."],
      ["Does JournalX work with Kite?", "Yes. JournalX complements Kite — you trade on Kite, then journal and analyse those trades in JournalX by importing your Console export or quick-logging in about 10 seconds."],
      ["Is it good for F&O and intraday?", "Yes. JournalX separates options, futures, equity and intraday so you can see exactly which segment and which setup actually makes you money."],
    ],
  },

  "dhan-trading-journal": {
    slug: "dhan-trading-journal",
    market: "Dhan",
    adj: "Dhan",
    eyebrow: "For Dhan traders",
    h1: "Dhan trading journal & analytics",
    title: "Dhan Trading Journal & Trade Analytics | JournalX",
    description:
      "Journal and analyse your Dhan trades. Import your trade history as a CSV, then track win rate, R-multiples, drawdown, options data and trading psychology — in seconds.",
    keywords: [
      "dhan trading journal", "dhan trade analysis", "trading journal for dhan",
      "dhan options journal", "trading journal india", "f&o trading journal",
    ],
    intro:
      "Dhan is fast for trading; JournalX is where you find your edge afterwards. Import your Dhan trade history or quick-log trades, and see the win rate, R-multiples, drawdown and psychology patterns behind your P&L.",
    extra: { icon: "candles", title: "Options & F&O analytics", body: "Per-strategy and per-expiry breakdowns for options and futures, with adaptive precision for Indian contracts." },
    faqs: [
      ["How do I get my Dhan trades into JournalX?", "Export your trade/P&L report from Dhan as a CSV and import it with our template, or quick-log trades manually in about 10 seconds."],
      ["Can it analyse my options trades?", "Yes. JournalX breaks down options performance by strategy and expiry so you can see which setups carry your account and which bleed it."],
      ["Is JournalX free to start?", "Yes — you can start free with no card, and upgrade later for advanced analytics and higher limits."],
    ],
  },

  "upstox-trading-journal": {
    slug: "upstox-trading-journal",
    market: "Upstox",
    adj: "Upstox",
    eyebrow: "For Upstox traders",
    h1: "Upstox trading journal & analytics",
    title: "Upstox Trading Journal & Trade Analytics | JournalX",
    description:
      "Make sense of your Upstox trades. Import your trade history/P&L as a CSV and track win rate, R-multiples, drawdown and psychology across equity, F&O and intraday.",
    keywords: [
      "upstox trading journal", "upstox trade analysis", "trading journal for upstox",
      "upstox p&l analysis", "intraday journal india", "trading tracker india",
    ],
    intro:
      "Your Upstox statement lists trades; JournalX turns them into decisions. Import your history or quick-log, and get the analytics and behavioural insights that actually move your P&L.",
    extra: { icon: "clock", title: "Session & setup analytics", body: "See your performance by setup, segment and market session so you can double down on what works and cut what doesn't." },
    faqs: [
      ["How do I import Upstox trades?", "Download your trade or P&L report from Upstox as a CSV and import it into JournalX, or quick-log trades manually in seconds."],
      ["Does it support F&O and intraday?", "Yes — equity, futures, options and intraday are tracked separately with the right precision for Indian markets."],
      ["Is my data private?", "Yes. JournalX only ever uses read-only data you import, and your journal stays private to you."],
    ],
  },

  "angel-one-trading-journal": {
    slug: "angel-one-trading-journal",
    market: "Angel One",
    adj: "Angel One",
    eyebrow: "For Angel One traders",
    h1: "Angel One trading journal & analytics",
    title: "Angel One Trading Journal & Analytics | JournalX",
    description:
      "Journal your Angel One trades and find your edge. Import your trade history/P&L as a CSV, then track win rate, R-multiples, drawdown and trading psychology.",
    keywords: [
      "angel one trading journal", "angel broking journal", "trading journal for angel one",
      "angel one trade analysis", "f&o journal india", "stock trading journal india",
    ],
    intro:
      "Angel One gets you into the market; JournalX shows you how to stay profitable in it. Import your trades or quick-log them, and uncover the patterns behind your wins and losses.",
    extra: { icon: "target", title: "Edge-finding analytics", body: "Per-setup win rate, R-multiples and expectancy so you can see your real edge — not just your account balance." },
    faqs: [
      ["How do I import Angel One trades?", "Export your trade book or P&L statement from Angel One as a CSV and upload it to JournalX, or quick-log trades in about 10 seconds."],
      ["Is it suitable for Indian stocks and F&O?", "Yes. JournalX handles equity, futures and options with analytics tuned to Indian market hours and instruments."],
      ["Do I need to pay to start?", "No. Start free with no card; upgrade only when you want deeper analytics and higher limits."],
    ],
  },

  "groww-trading-journal": {
    slug: "groww-trading-journal",
    market: "Groww",
    adj: "Groww",
    eyebrow: "For Groww traders",
    h1: "Groww trading journal & analytics",
    title: "Groww Trading Journal & Trade Analytics | JournalX",
    description:
      "Track and analyse your Groww trades. Import your trade history as a CSV and see win rate, R-multiples, drawdown and psychology across stocks, F&O and intraday.",
    keywords: [
      "groww trading journal", "groww trade analysis", "trading journal for groww",
      "groww p&l analysis", "beginner trading journal india", "trading journal app india",
    ],
    intro:
      "Groww makes trading simple; JournalX makes it measurable. Import your trades or quick-log them, and get the honest performance and psychology breakdown a broker app won't show you.",
    extra: { icon: "calendar", title: "See every day at a glance", body: "A colour-coded P&L calendar and per-setup stats make your consistency — or lack of it — impossible to ignore." },
    faqs: [
      ["How do I import Groww trades?", "Export your order/P&L history from Groww as a CSV and import it into JournalX, or quick-log trades manually in seconds."],
      ["Is JournalX good for beginners?", "Yes. It's fast to use and the analytics are plain-English, so newer traders can spot and fix expensive habits early."],
      ["Is it free?", "Yes, you can start free with no card required."],
    ],
  },

  "fyers-trading-journal": {
    slug: "fyers-trading-journal",
    market: "Fyers",
    adj: "Fyers",
    eyebrow: "For Fyers traders",
    h1: "Fyers trading journal & analytics",
    title: "Fyers Trading Journal & Trade Analytics | JournalX",
    description:
      "Journal your Fyers trades and sharpen your edge. Import your trade history/P&L as a CSV, then track win rate, R-multiples, drawdown and psychology for F&O and intraday.",
    keywords: [
      "fyers trading journal", "fyers trade analysis", "trading journal for fyers",
      "fyers p&l", "f&o trading journal india", "options trading journal india",
    ],
    intro:
      "Fyers is a favourite for active F&O traders; JournalX is built to find the leaks in exactly that style. Import your trades or quick-log, and see what your setups and sessions really earn.",
    extra: { icon: "candles", title: "F&O & options depth", body: "Per-strategy, per-expiry and per-session analytics for active options and futures traders." },
    faqs: [
      ["How do I import Fyers trades?", "Export your trade book or P&L from Fyers as a CSV and import it into JournalX, or quick-log trades in seconds."],
      ["Is it good for active F&O traders?", "Yes — JournalX is built for high-frequency F&O styles, with per-setup and per-session breakdowns to find your edge."],
      ["Can I track my psychology?", "Yes. Tag emotion and discipline on every trade and see what tilt, FOMO and revenge trading actually cost you."],
    ],
  },

  "5paisa-trading-journal": {
    slug: "5paisa-trading-journal",
    market: "5paisa",
    adj: "5paisa",
    eyebrow: "For 5paisa traders",
    h1: "5paisa trading journal & analytics",
    title: "5paisa Trading Journal & Trade Analytics | JournalX",
    description:
      "Analyse your 5paisa trades properly. Import your trade history as a CSV and track win rate, R-multiples, drawdown and trading psychology across segments.",
    keywords: [
      "5paisa trading journal", "5paisa trade analysis", "trading journal for 5paisa",
      "low cost trading journal india", "trading tracker india", "stock journal india",
    ],
    intro:
      "Trading low-cost on 5paisa only pays off if you keep the edge. Import your 5paisa trades or quick-log them, and let JournalX show you which habits are quietly eating your profits.",
    extra: { icon: "target", title: "Find and keep your edge", body: "Win rate, expectancy and R-multiples per setup so you know what's actually working." },
    faqs: [
      ["How do I import 5paisa trades?", "Export your trade/P&L report from 5paisa as a CSV and import it into JournalX, or quick-log trades manually."],
      ["Does it work for F&O and equity?", "Yes, all segments are supported with analytics suited to Indian markets."],
      ["Is there a free plan?", "Yes — start free, no card required."],
    ],
  },

  "icici-direct-trading-journal": {
    slug: "icici-direct-trading-journal",
    market: "ICICI Direct",
    adj: "ICICI Direct",
    eyebrow: "For ICICI Direct traders",
    h1: "ICICI Direct trading journal & analytics",
    title: "ICICI Direct Trading Journal & Analytics | JournalX",
    description:
      "Journal your ICICI Direct trades and find your edge. Import your trade/P&L statement as a CSV, then track win rate, R-multiples, drawdown and psychology.",
    keywords: [
      "icici direct trading journal", "icicidirect trade analysis", "trading journal for icici direct",
      "icici direct p&l analysis", "stock trading journal india", "trading journal app india",
    ],
    intro:
      "ICICI Direct gives you the platform; JournalX gives you the post-trade clarity. Import your statement or quick-log trades, and see the real story behind your P&L.",
    extra: { icon: "calendar", title: "Clear performance reviews", body: "Daily, weekly and monthly reviews with a P&L calendar so your consistency is obvious at a glance." },
    faqs: [
      ["How do I import ICICI Direct trades?", "Export your trade book or P&L statement from ICICI Direct as a CSV and upload it to JournalX, or quick-log trades in seconds."],
      ["Is it suitable for long-term and active traders?", "Yes — whether you swing trade or trade intraday F&O, JournalX adapts its analytics to your style."],
      ["Is my data safe?", "Yes. JournalX uses only the read-only data you import and keeps your journal private."],
    ],
  },
};

export const BROKER_SLUGS = Object.keys(BROKER_PAGES);
