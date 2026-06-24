/* Programmatic per-prop-firm landing pages. Same config shape as
   data/marketPages.js, rendered via pages/[slug].jsx through MarketLanding.
   These complement the general /prop-firm-trading-journal page by targeting
   "[firm] trading journal" / "[firm] journal" — high-intent, low-competition.

   Rules change often, so copy stays general and tells traders to check current
   firm terms rather than quoting exact numbers that may go stale. */

export const PROP_FIRM_PAGES = {
  "ftmo-trading-journal": {
    slug: "ftmo-trading-journal",
    market: "FTMO",
    adj: "FTMO",
    eyebrow: "For FTMO traders",
    h1: "FTMO trading journal & drawdown tracker",
    title: "FTMO Trading Journal & Drawdown Tracker | JournalX",
    description:
      "Pass FTMO and stay funded. JournalX tracks your daily and max loss, profit target progress and trading psychology, import MT4/MT5 history or quick-log in seconds.",
    keywords: [
      "ftmo trading journal", "ftmo journal", "ftmo drawdown tracker", "trading journal for ftmo",
      "how to pass ftmo", "ftmo challenge journal", "funded account journal",
    ],
    intro:
      "Most FTMO accounts don't fail on strategy — they fail on the daily loss limit and discipline. JournalX tracks your daily and max drawdown against your target so you can see a breach coming before it ends your challenge.",
    extra: { icon: "shield", title: "FTMO rule tracking", body: "Monitor your daily loss, max loss and profit-target progress, and score the discipline that keeps an FTMO account alive. Always confirm current limits in your FTMO dashboard." },
    faqs: [
      ["Can JournalX track my FTMO drawdown?", "Yes. Log or import your trades and JournalX shows your running daily and max drawdown plus profit-target progress, so you can stay inside FTMO's limits. Always confirm exact figures in your FTMO dashboard, as rules can change."],
      ["How do I import FTMO (MT4/MT5) trades?", "Export your account history report from MetaTrader 4 or 5 and import the CSV into JournalX, or quick-log trades in about 10 seconds."],
      ["Will it help me pass the FTMO challenge?", "JournalX won't trade for you, but by tracking drawdown and exposing discipline leaks like overtrading and revenge trading, it helps you avoid the behavioural mistakes that end most challenges."],
    ],
  },

  "the5ers-trading-journal": {
    slug: "the5ers-trading-journal",
    market: "The5ers",
    adj: "The5ers",
    eyebrow: "For The5ers traders",
    h1: "The5ers trading journal & rule tracker",
    title: "The5ers Trading Journal & Drawdown Tracker | JournalX",
    description:
      "Journal your The5ers funded account. Track drawdown, profit targets and discipline, import MT4/MT5 history or quick-log, and protect your funded capital.",
    keywords: [
      "the5ers trading journal", "the5ers journal", "trading journal for the5ers",
      "the5ers drawdown", "funded account journal", "prop firm journal",
    ],
    intro:
      "The5ers rewards steady, scaled growth — exactly the style a journal helps you keep. Track your drawdown and discipline in JournalX so a single bad session doesn't undo weeks of careful scaling.",
    extra: { icon: "shield", title: "Drawdown & discipline tracking", body: "Monitor your drawdown and profit targets and score discipline on every trade. Confirm current limits with The5ers, as program rules change." },
    faqs: [
      ["Does JournalX track The5ers rules?", "Yes — log or import trades and track your drawdown and profit-target progress, plus discipline analytics. Always confirm exact rules in your The5ers account, as they can change."],
      ["How do I import my trades?", "Export your MT4/MT5 account history as a CSV and import it, or quick-log trades in seconds."],
      ["Is it good for scaling accounts?", "Yes. JournalX's equity-curve and consistency views are ideal for the gradual scaling The5ers is known for."],
    ],
  },

  "topstep-trading-journal": {
    slug: "topstep-trading-journal",
    market: "Topstep",
    adj: "Topstep",
    eyebrow: "For Topstep futures traders",
    h1: "Topstep trading journal for futures",
    title: "Topstep Trading Journal & Analytics (Futures) | JournalX",
    description:
      "Journal your Topstep Combine and funded futures account. Track daily loss, trailing drawdown and discipline, import your platform history or quick-log in seconds.",
    keywords: [
      "topstep trading journal", "topstep journal", "trading journal for topstep",
      "topstep combine journal", "futures funded account journal", "trailing drawdown tracker",
    ],
    intro:
      "Topstep is futures-first, and its trailing drawdown catches more traders than any losing streak. JournalX tracks your trailing drawdown and daily loss so you always know how much room you have left.",
    extra: { icon: "shield", title: "Trailing drawdown tracking", body: "See your trailing drawdown buffer and daily-loss usage on every trade. Confirm current Combine and funded rules with Topstep." },
    faqs: [
      ["Can it track Topstep's trailing drawdown?", "Yes. JournalX tracks your trailing drawdown buffer and daily loss as you log trades, so you can stop before a rule does it for you. Confirm exact figures in your Topstep account."],
      ["How do I import Topstep trades?", "Export your trade history from your trading platform (e.g., NinjaTrader, Tradovate) as a CSV and import it, or quick-log trades manually."],
      ["Is it built for futures?", "Yes — JournalX handles futures contracts with the right precision and per-session analytics for futures traders."],
    ],
  },

  "fundednext-trading-journal": {
    slug: "fundednext-trading-journal",
    market: "FundedNext",
    adj: "FundedNext",
    eyebrow: "For FundedNext traders",
    h1: "FundedNext trading journal & tracker",
    title: "FundedNext Trading Journal & Drawdown Tracker | JournalX",
    description:
      "Journal your FundedNext account. Track drawdown, the consistency rule and discipline, import MT4/MT5 history or quick-log, and protect your payouts.",
    keywords: [
      "fundednext trading journal", "fundednext journal", "trading journal for fundednext",
      "fundednext consistency rule", "fundednext drawdown", "funded account journal",
    ],
    intro:
      "FundedNext's consistency requirements trip up traders who've already hit target. JournalX surfaces your best-day concentration and drawdown so you stay eligible for the payout you earned.",
    extra: { icon: "shield", title: "Consistency & drawdown tracking", body: "Track your best-day concentration, drawdown and discipline. Confirm current consistency and drawdown rules with FundedNext." },
    faqs: [
      ["Can JournalX track the FundedNext consistency rule?", "Yes. It surfaces your best-day P&L as a share of total profit, so you can keep within consistency requirements and avoid a payout block. Confirm exact thresholds with FundedNext."],
      ["How do I import FundedNext trades?", "Export your MT4/MT5 account history as a CSV and import it into JournalX, or quick-log trades in seconds."],
      ["Does it track drawdown too?", "Yes — daily and max drawdown plus profit-target progress are tracked on every trade."],
    ],
  },

  "apex-trading-journal": {
    slug: "apex-trading-journal",
    market: "Apex Trader Funding",
    adj: "Apex",
    eyebrow: "For Apex futures traders",
    h1: "Apex Trader Funding trading journal",
    title: "Apex Trader Funding Journal & Tracker (Futures) | JournalX",
    description:
      "Journal your Apex Trader Funding evaluation and funded account. Track trailing drawdown, consistency and discipline for futures, import your history or quick-log.",
    keywords: [
      "apex trader funding journal", "apex trading journal", "trading journal for apex",
      "apex drawdown tracker", "futures funded journal", "trailing threshold tracker",
    ],
    intro:
      "Apex is one of the most popular futures funding programs, and its trailing threshold is where most accounts end. JournalX keeps that threshold and your daily risk in view on every trade.",
    extra: { icon: "shield", title: "Trailing threshold tracking", body: "Monitor your trailing drawdown threshold and daily risk. Confirm current Apex rules in your dashboard." },
    faqs: [
      ["Can it track Apex's trailing threshold?", "Yes. JournalX tracks your trailing drawdown and risk usage as you log trades. Always confirm exact figures with Apex Trader Funding."],
      ["How do I import Apex trades?", "Export your platform history (e.g., Tradovate, NinjaTrader, Rithmic) as a CSV and import it, or quick-log trades manually."],
      ["Is it suitable for futures scalping?", "Yes — JournalX handles high-frequency futures with per-session and per-setup analytics."],
    ],
  },

  "e8-trading-journal": {
    slug: "e8-trading-journal",
    market: "E8 Markets",
    adj: "E8",
    eyebrow: "For E8 Markets traders",
    h1: "E8 Markets trading journal & tracker",
    title: "E8 Markets Trading Journal & Drawdown Tracker | JournalX",
    description:
      "Journal your E8 Markets account. Track drawdown, profit targets and trading discipline, import MT4/MT5 history or quick-log in seconds, and protect your funded capital.",
    keywords: [
      "e8 markets trading journal", "e8 funding journal", "trading journal for e8",
      "e8 drawdown tracker", "funded account journal", "prop firm trading journal",
    ],
    intro:
      "E8 gives flexible targets, but drawdown and discipline still decide who keeps the account. JournalX tracks both so your evaluation and funded phase stay on the rails.",
    extra: { icon: "shield", title: "Drawdown & discipline tracking", body: "Track daily and max drawdown plus discipline on every trade. Confirm current E8 rules in your dashboard." },
    faqs: [
      ["Does JournalX track E8 rules?", "Yes — log or import trades to track drawdown and profit-target progress plus discipline analytics. Confirm exact rules with E8 Markets."],
      ["How do I import E8 trades?", "Export your MT4/MT5 account history as a CSV and import it, or quick-log trades manually in seconds."],
      ["Is there a free plan?", "Yes, start free with no card required."],
    ],
  },

  "funding-pips-trading-journal": {
    slug: "funding-pips-trading-journal",
    market: "Funding Pips",
    adj: "Funding Pips",
    eyebrow: "For Funding Pips traders",
    h1: "Funding Pips trading journal & tracker",
    title: "Funding Pips Trading Journal & Drawdown Tracker | JournalX",
    description:
      "Journal your Funding Pips account. Track drawdown, the consistency rule and discipline, import MT4/MT5 history or quick-log, and stay eligible for payouts.",
    keywords: [
      "funding pips trading journal", "funding pips journal", "trading journal for funding pips",
      "funding pips consistency", "funding pips drawdown", "funded account journal",
    ],
    intro:
      "Funding Pips traders pass on strategy and fail on rules. JournalX tracks your drawdown and best-day concentration so the consistency rule never blindsides you at payout.",
    extra: { icon: "shield", title: "Consistency & drawdown tracking", body: "Track best-day concentration, drawdown and discipline. Confirm current Funding Pips rules in your dashboard." },
    faqs: [
      ["Can it track the Funding Pips consistency rule?", "Yes. JournalX shows your best-day P&L as a share of total profit so you can stay within consistency limits. Confirm exact thresholds with Funding Pips."],
      ["How do I import Funding Pips trades?", "Export your MT4/MT5 account history as a CSV and import it into JournalX, or quick-log trades in seconds."],
      ["Does it track drawdown?", "Yes — daily and max drawdown plus profit-target progress are tracked on every trade."],
    ],
  },
};

export const PROP_FIRM_SLUGS = Object.keys(PROP_FIRM_PAGES);
