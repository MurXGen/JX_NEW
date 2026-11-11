"use client";

/* Feature panel under the light hero: rounded gradient card with copy, pill
   chips and a floating product mock (P&L card overlapping a trades table).
   The mock uses clearly labelled sample data. */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BrainCircuit, CalendarDays, ShieldAlert, Upload } from "lucide-react";
import s from "./LightHero.module.css";

const CHIPS = [
  { label: "10-second trade log", Icon: CalendarDays },
  { label: "Drawdown alerts", Icon: ShieldAlert },
  { label: "Psychology tagging", Icon: BrainCircuit },
  { label: "CSV & exchange import", Icon: Upload },
];

/* Illustrative sample rows (not real user data). */
const ROWS = [
  { sym: "ES", side: "Long", date: "Nov 3", setup: "Opening drive", r: "+2.1R", pnl: "+$1,312.50", up: true },
  { sym: "EUR/USD", side: "Short", date: "Nov 4", setup: "London breakout", r: "-1.0R", pnl: "-$420.00", up: false },
  { sym: "NVDA", side: "Long", date: "Nov 6", setup: "VWAP reclaim", r: "+3.4R", pnl: "+$2,046.80", up: true },
  { sym: "BTC/USDT", side: "Long", date: "Nov 7", setup: "Range retest", r: "+1.6R", pnl: "+$884.20", up: true },
  { sym: "NQ", side: "Short", date: "Nov 10", setup: "Failed high", r: "+0.8R", pnl: "+$515.00", up: true },
];

const CAL = [320, -140, 510, 0, 220, 90, -260, 640, 180, 0, -90, 410, 270, -320, 150, 0, 560, 120, -60, 380, 210, -80, 0, 330, 140, 460, -200, 90];

const SPARK = "M0,52 L20,48 L40,50 L60,40 L80,43 L100,32 L120,35 L140,24 L160,27 L180,14 L200,10";

export default function HeroFeaturePanel() {
  const reduced = useReducedMotion();

  return (
    <section className={`${s.lx} ${s.panelSection}`} aria-labelledby="hero-feature-title">
      <div className={s.wrap}>
        <div className={s.panel}>
          <div className={s.panelRings} aria-hidden="true" />

          <div className={s.panelCopy}>
            <h2 id="hero-feature-title" className={s.panelTitle}>
              Review every trade with clarity
            </h2>
            <p className={s.panelText}>
              No spreadsheets to maintain. Log or import your trades and JournalX turns them into a P&amp;L
              calendar, equity curve and per-setup breakdown, so your weekly review shows what to repeat and
              what to cut.
            </p>
            <ul className={s.chips} aria-label="Key features">
              {CHIPS.map(({ label, Icon }) => (
                <li key={label} className={s.chip}>
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
            <a href="/features" className={`${s.btn} ${s.btnOutline}`}>
              Explore all features <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>

          {/* phone preview with analytics popping out (mobile only) */}
          <div
            className={s.phoneArea}
            role="img"
            aria-label="JournalX on a phone with analytics cards popping out: net P&L +$4,338.50, win rate 80%, and an insight that early exits cost $612 this month. Sample data."
          >
            <div className={s.phone} aria-hidden="true">
              <div className={s.phoneNotch} />
              <div className={s.phoneStatus}><span>9:41</span><span>●●● ▮</span></div>
              <div className={s.phoneHead}><span>Analytics</span><b>Nov</b></div>
              <div className={s.phoneCal}>
                {CAL.map((v, i) => (
                  <i key={i} style={{ background: v === 0 ? "#16171b" : v > 0 ? `rgba(46,189,133,${0.2 + Math.min(1, v / 600) * 0.6})` : `rgba(246,70,93,${0.2 + Math.min(1, -v / 600) * 0.6})` }} />
                ))}
              </div>
              <ul className={s.phoneList}>
                {ROWS.slice(0, 3).map((r) => (
                  <li key={r.sym}><span className={s.phoneSym}><b>{r.sym}</b><em>{r.setup}</em></span><b className={r.up ? s.pos : s.neg}>{r.pnl}</b></li>
                ))}
              </ul>
              <div className={s.phoneTabs}><span>Journal</span><span data-on="true">Analytics</span><span>Calendar</span></div>
            </div>

            {/* pop-out: net P&L */}
            <motion.div
              className={`${s.pop} ${s.popPnl}`}
              aria-hidden="true"
              initial={reduced ? false : { opacity: 0, x: -24, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={s.pnlLabel}>Net P&amp;L, this month</div>
              <div className={s.popValue}>+$4,338.50</div>
              <svg viewBox="0 0 200 60" width="100%" height="34" preserveAspectRatio="none" style={{ display: "block", marginTop: 6 }}>
                <path d={`${SPARK} L200,60 L0,60 Z`} fill="url(#hfp-area)" />
                <path d={SPARK} fill="none" stroke="#fcd535" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </motion.div>

            {/* pop-out: win rate ring */}
            <motion.div
              className={`${s.pop} ${s.popWin}`}
              aria-hidden="true"
              initial={reduced ? false : { opacity: 0, x: 24, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <svg viewBox="0 0 44 44" width="44" height="44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#1f2125" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#2ebd85" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${0.8 * 113} 113`} transform="rotate(-90 22 22)" />
              </svg>
              <div><b>80%</b><span>Win rate</span></div>
            </motion.div>

            {/* pop-out: highlighted impact */}
            <motion.div
              className={`${s.pop} ${s.popImpact}`}
              aria-hidden="true"
              initial={reduced ? false : { opacity: 0, y: 24, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={s.impactTag}>Biggest impact</span>
              <div className={s.impactRow}>
                <div>
                  <b>Early exits</b>
                  <span>cost you this month</span>
                </div>
                <strong>-$612</strong>
              </div>
              <div className={s.impactBar}><i style={{ width: "68%" }} /></div>
              <span className={s.impactFoot}>Fix this one habit to keep ~14% more profit · sample</span>
            </motion.div>
          </div>

          <div
            className={s.mockArea}
            role="img"
            aria-label="JournalX dashboard example: a trades table with setups, R-multiples and P&L, and a net P&L summary card with an equity sparkline. Sample data."
          >
            <div className={s.window} aria-hidden="true">
              <div className={s.windowBar}>
                <span className={s.dot} style={{ background: "#ff5f57" }} />
                <span className={s.dot} style={{ background: "#febc2e" }} />
                <span className={s.dot} style={{ background: "#28c840" }} />
                <span className={s.url}>journalx.app/trades</span>
              </div>
              <div className={s.windowBody}>
                <div className={s.reviewBox}>
                  <b>Weekly review ready</b>
                  <span>Your best setup this week: VWAP reclaim (+3.4R). Most costly habit: early exits.</span>
                </div>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th className={s.hideSm}>Date</th>
                      <th className={s.hideSm}>Setup</th>
                      <th>R</th>
                      <th>P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r) => (
                      <tr key={r.sym + r.date}>
                        <td>{r.sym}</td>
                        <td><span className={`${s.side} ${r.side === "Long" ? s.long : s.short}`}>{r.side}</span></td>
                        <td className={s.hideSm}>{r.date}</td>
                        <td className={s.hideSm}>{r.setup}</td>
                        <td className={r.up ? s.pos : s.neg}>{r.r}</td>
                        <td className={r.up ? s.pos : s.neg}>{r.pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className={s.sample}>Sample data</span>
            </div>

            <motion.div
              className={s.pnlCard}
              aria-hidden="true"
              animate={reduced ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className={s.pnlLabel}>Net P&amp;L, this month</div>
              <div className={s.pnlValue}>+$4,338.50</div>
              <div className={s.pnlDelta}>Win rate 80% · 4 of 5 trades green</div>
              <svg viewBox="0 0 200 60" width="100%" height="60" style={{ marginTop: 12, display: "block" }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hfp-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fcd535" stopOpacity="0.45" />
                    <stop offset="1" stopColor="#fcd535" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${SPARK} L200,60 L0,60 Z`} fill="url(#hfp-area)" />
                <path d={SPARK} fill="none" stroke="#fcd535" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className={s.pnlFoot}><span>Trades: 5</span><span>Avg R: +1.4</span></div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
