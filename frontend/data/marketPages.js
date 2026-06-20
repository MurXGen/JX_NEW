/* Per-market keyword landing pages. Each entry drives one SEO page rendered by
   components/landingPage/MarketLanding.jsx at a clean URL (the `slug`).
   The shared template adds the quick-log + import-from-sheet angle for every
   market, so configs only carry the market-specific copy + keywords + FAQ. */

export const MARKET_PAGES = {
  "prop-firm-trading-journal": {
    slug: "prop-firm-trading-journal",
    market: "funded & prop firm",
    adj: "funded-account",
    eyebrow: "For funded & prop firm traders",
    h1: "The trading journal for funded & prop firm traders",
    title: "Prop Firm & Funded Account Trading Journal | JournalX",
    description:
      "The trading journal built for funded and prop firm traders. Track trailing & daily drawdown, the consistency rule, and trading psychology, log a trade in 10 seconds or import from a CSV. Pass FTMO, Topstep, MyForexFunds and Apex evaluations.",
    keywords: [
      "prop firm trading journal", "funded account journal", "FTMO journal", "Topstep journal",
      "trading journal for funded traders", "consistency rule tracker", "drawdown tracker",
    ],
    intro:
      "Passing an evaluation is one thing, keeping a funded account is another. JournalX tracks the drawdown, consistency and discipline rules that end most funded accounts, so you can see a violation coming before it costs you the payout.",
    extra: { icon: "shield", title: "Drawdown & consistency tracking", body: "Monitor trailing and daily drawdown and the consistency rule across firms like FTMO, Topstep, MyForexFunds and Apex." },
    faqs: [
      ["Is JournalX good for FTMO and other prop firms?", "Yes, it's purpose-built for funded and prop firm traders, with drawdown, consistency and discipline analytics most journals ignore, across FTMO, Topstep, MyForexFunds, Apex and more."],
      ["Can it track the consistency rule?", "Yes. JournalX surfaces your best-day concentration and day-by-day P&L so you can keep within consistency requirements and avoid tripping the rule on payout."],
      ["How fast is logging?", "About 10 seconds for a quick P&L log, or import your whole history from a CSV, so your evaluation and funded data stay complete."],
    ],
  },

  "forex-trading-journal": {
    slug: "forex-trading-journal",
    market: "forex",
    adj: "forex",
    eyebrow: "For forex traders",
    h1: "Forex trading journal that finds your edge",
    title: "Forex Trading Journal & Analytics | JournalX",
    description:
      "A forex trading journal that turns every pair into analytics, win rate, R-multiples, pip & risk tracking, sessions and psychology. Log a trade in 10 seconds or import your MT4/MT5 statement as a CSV. EUR/USD, GBP/USD, XAU/USD and more.",
    keywords: [
      "forex trading journal", "fx trade journal", "MT4 trading journal", "MT5 journal",
      "forex trade tracker", "forex analytics", "trading session analysis",
    ],
    intro:
      "Forex rewards discipline and session timing. JournalX automatically scores your sessions, R-multiples and psychology so you can see which pairs and times actually make you money, and which quietly bleed it.",
    extra: { icon: "clock", title: "Session & timeframe analytics", body: "See your edge by session (Asia, London, New York) and timeframe, with adaptive pip precision for any pair." },
    faqs: [
      ["Does it work with MetaTrader (MT4/MT5)?", "Yes, export your account-history report from MT4/MT5 and import it, or quick-log trades manually in seconds. All major pairs and metals are supported with the right decimal precision."],
      ["Which forex pairs are supported?", "Any pair in any currency, majors, minors, exotics and metals like XAU/USD, with price precision that adapts to the instrument."],
      ["Can I see my best trading sessions?", "Yes. JournalX breaks down performance by session and timeframe so you can focus on your most profitable windows."],
    ],
  },

  "crypto-trading-journal": {
    slug: "crypto-trading-journal",
    market: "crypto",
    adj: "crypto",
    eyebrow: "For crypto traders",
    h1: "Crypto trading journal for spot & futures",
    title: "Crypto Trading Journal & Analytics | JournalX",
    description:
      "A crypto trading journal for spot and futures, auto-import from your exchange, mark trades on a live chart, and get win rate, R-multiples, drawdown and psychology analytics. Log a trade in 10 seconds. BTC, ETH, SOL and any pair, any currency.",
    keywords: [
      "crypto trading journal", "bitcoin trading journal", "crypto trade tracker", "futures crypto journal",
      "binance trading journal", "crypto analytics", "spot and futures journal",
    ],
    intro:
      "Crypto moves fast and trades pile up. JournalX lets you mark entries and exits right on a live chart, auto-import from your exchange, and turn the chaos into a clear, compounding edge.",
    extra: { icon: "candles", title: "Mark trades on a live chart", body: "Drop entry and exit on a live crypto chart; prices fill automatically and the marked chart shows on the trade details." },
    faqs: [
      ["Can I auto-import my crypto trades?", "Yes, connect a read-only exchange key (Binance live today; others via export + CSV), or quick-log trades manually. Trades flow straight into your analytics."],
      ["Does it handle small-priced coins?", "Yes. Price precision adapts automatically, so low-priced assets like SHIB show their real decimals instead of rounding to zero."],
      ["Spot and futures both?", "Both, log spot or leveraged futures positions, longs and shorts, in any quote currency."],
    ],
  },

  "stock-trading-journal": {
    slug: "stock-trading-journal",
    market: "stock",
    adj: "stock",
    eyebrow: "For stock traders",
    h1: "Stock trading journal & analytics",
    title: "Stock Trading Journal & Analytics | JournalX",
    description:
      "A stock trading journal that turns your trades into analytics, win rate, R-multiples, payoff, drawdown, a P&L calendar and psychology scoring. Log a trade in 10 seconds or import from a CSV. Works for day trading and swing trading.",
    keywords: [
      "stock trading journal", "day trading journal", "swing trading journal", "stock trade tracker",
      "equity trading journal", "stock analytics", "trade log app",
    ],
    intro:
      "Whether you day trade or swing trade equities, JournalX shows which setups and conditions make you money. Log in seconds or import a CSV, then review win rate, R-multiples and a colour-coded P&L calendar.",
    extra: { icon: "calendar", title: "P&L calendar & per-setup stats", body: "A colour-coded calendar and per-strategy breakdown make your consistency, and your best setups, obvious at a glance." },
    faqs: [
      ["Is it good for day trading and swing trading?", "Both. JournalX handles fast intraday logging and longer swing trades, with hold-time and timeframe analytics for each."],
      ["Can I import from my broker?", "Export your trade history to CSV and import it with our template, or quick-log trades manually in seconds."],
      ["Does it track my best strategies?", "Yes, tag setups and see win rate, expectancy and payoff per strategy so you can double down on what works."],
    ],
  },

  "futures-trading-journal": {
    slug: "futures-trading-journal",
    market: "futures",
    adj: "futures",
    eyebrow: "For futures traders",
    h1: "Futures trading journal & analytics",
    title: "Futures Trading Journal & Analytics | JournalX",
    description:
      "A futures trading journal with R-multiples, drawdown, expectancy and psychology analytics, ideal for funded futures traders. Log a trade in 10 seconds or import from a CSV. ES, NQ, CL, GC and more.",
    keywords: [
      "futures trading journal", "futures trade tracker", "ES NQ journal", "funded futures journal",
      "Topstep journal", "futures analytics", "day trading futures journal",
    ],
    intro:
      "Futures traders live and die by risk per contract and consistency. JournalX scores your R-multiples, drawdown and discipline so you can scale contracts with data, not hope.",
    extra: { icon: "shield", title: "Risk & drawdown per contract", body: "Planned vs realised R:R, expectancy and drawdown tracking, built for funded futures evaluations like Topstep and Apex." },
    faqs: [
      ["Is it suited to funded futures accounts?", "Yes, drawdown and consistency tracking make it ideal for Topstep, Apex and other funded futures programs."],
      ["Which futures can I log?", "Any contract, ES, NQ, CL, GC and more, in any currency, with adaptive tick precision."],
      ["How do I get my trades in?", "Quick-log in seconds, or export your platform's history to CSV and bulk-import it."],
    ],
  },

  "options-trading-journal": {
    slug: "options-trading-journal",
    market: "options",
    adj: "options",
    eyebrow: "For options traders",
    h1: "Options trading journal & analytics",
    title: "Options Trading Journal & Analytics | JournalX",
    description:
      "An options trading journal that tracks P&L, win rate, R-multiples, payoff and psychology across your strategies. Log a trade in 10 seconds or import from a CSV. Works for income, directional and swing options trading.",
    keywords: [
      "options trading journal", "option trade tracker", "options analytics", "income options journal",
      "options strategy journal", "trade log app", "options P&L tracker",
    ],
    intro:
      "Options strategies hide their edge in the details. JournalX turns every trade into win rate, payoff and expectancy by strategy, so you know which plays to keep and which to cut.",
    extra: { icon: "target", title: "Per-strategy expectancy", body: "Track win rate, payoff and expectancy by options strategy, plus the psychology behind your decisions." },
    faqs: [
      ["Can I journal any options strategy?", "Yes, log directional, income or multi-leg ideas; record your thesis, risk and outcome, and review expectancy per strategy."],
      ["How do I log quickly?", "Use the 10-second quick log for net P&L, or import a CSV of your trades with our template."],
      ["Does it track psychology?", "Yes, tag emotion and discipline on each trade to expose the behavioural leaks that cost you."],
    ],
  },
};

export const MARKET_SLUGS = Object.keys(MARKET_PAGES);
