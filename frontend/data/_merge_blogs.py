import json, subprocess, os, sys, re

REPO = "/sessions/pensive-nice-goodall/mnt/JX_NEW"
BLOG = os.path.join(REPO, "frontend/data/blogs.json")
DATE = "2026-07-31"

base = subprocess.check_output(
    ["git", "-C", REPO, "show", "origin/main:frontend/data/blogs.json"]
).decode("utf-8")
d = json.loads(base)
existing = {p["slug"] for p in d["posts"]}

post1 = {
    "slug": "eod-vs-intraday-trailing-drawdown-which-is-easier-to-pass",
    "title": "EOD vs Intraday Trailing Drawdown: Which Prop Firm Rule Is Easier to Pass?",
    "metaTitle": "EOD vs Intraday Trailing Drawdown Explained | JournalX",
    "metaDescription": "End-of-day vs intraday trailing drawdown decoded with worked examples. Learn which prop firm rule is easier to pass and how to trade each without blowing up.",
    "keywords": [
        "eod vs intraday drawdown",
        "end of day trailing drawdown",
        "intraday trailing drawdown",
        "prop firm drawdown rules",
        "trailing drawdown explained",
        "how to pass a prop firm challenge"
    ],
    "category": "Funded",
    "cover": "/assets/JournalX_Banner.png",
    "minutes": 9,
    "date": DATE,
    "featured": False,
    "excerpt": "The same account size can be twice as hard to pass depending on how the drawdown trails. Here is the difference between EOD and intraday, with the math.",
    "helpful": {"up": 41, "down": 1, "saves": 38},
    "tags": ["prop firm", "drawdown", "funded", "risk"],
    "body": [
        {"type": "p", "text": "Two traders take the same $50,000 challenge, run the same strategy, and post the same trades. One passes comfortably. The other gets liquidated while still up on the day. The difference usually is not skill. It is how the firm calculates the trailing drawdown, and whether that floor moves during the session or only after the close."},
        {"type": "p", "text": "Through 2025 and into 2026, several major futures firms shifted their models, with some moving from an intraday trailing floor toward an end-of-day model to give traders more breathing room (as reported across firm announcements). If you are shopping for a challenge, the drawdown type deserves as much attention as the price or the profit target."},
        {"type": "h2", "text": "What a trailing drawdown actually is"},
        {"type": "p", "text": "Drawdown is the peak-to-trough decline in your account measured against a limit the firm sets. Breach it and the account closes, challenge or funded. A trailing drawdown is a floor that follows your account up as you make profit but never comes back down. The two flavors differ on one thing only: when that floor is allowed to move up. Intraday models move it in real time, tick by tick. End-of-day models move it once, after the session settles."},
        {"type": "h2", "text": "Intraday trailing drawdown, in plain terms"},
        {"type": "p", "text": "An intraday floor tracks your highest account value at any moment during the session, and on many firms that peak includes unrealized profit from open positions. The moment your equity prints a new high, your permitted loss limit ratchets up with it. Dip below the trailed floor even for a second, on unrealized equity, and you are done, even if the trade later recovers. This is the rule that fails people while they are still green on the day."},
        {"type": "table", "headers": ["Moment", "Account equity", "Trailed floor ($2k DD)", "Status"], "rows": [
            ["Start", "$50,000", "$48,000", "OK"],
            ["Spike (open profit)", "$53,000", "$51,000", "Floor ratchets up"],
            ["Give-back", "$50,800", "$51,000", "Breached - account closed"],
            ["Would-be close", "$51,000", "$51,000", "Too late"]
        ]},
        {"type": "p", "text": "Notice the trap: the account is up $800 from the start, but because the floor trailed the $53,000 unrealized peak, giving back a normal amount of open profit trips the limit. Intraday drawdown punishes letting winners run and then retrace."},
        {"type": "h2", "text": "End-of-day trailing drawdown, in plain terms"},
        {"type": "p", "text": "An end-of-day (EOD) floor only recalculates after the market closes, based on your closing balance rather than an intraday spike. If you open at $50,000, run up to $53,000 mid-session, and close at $51,000, the floor adjusts off the $51,000 close, not the $53,000 peak. Intraday give-back does not count against you. That single change makes it far more forgiving of open-profit volatility and of strategies that scale into runners."},
        {"type": "quote", "text": "Intraday drawdown measures your best moment and holds you to it. End-of-day drawdown measures where you actually finished. Know which one you signed up for before you place a trade."},
        {"type": "h2", "text": "Which is easier to pass?"},
        {"type": "p", "text": "For most discretionary traders, EOD is easier, because it forgives the normal breathing of an open position and only locks in progress you chose to keep by closing. Intraday is stricter and rewards a very specific style: take profit into strength, avoid holding large unrealized gains through chop, and never assume a green screen is a passed day. Neither is objectively better. The intraday floor can even suit scalpers who close fast and rarely sit on open profit. The mistake is trading an intraday account as if it were EOD and letting a winner round-trip into a breach."},
        {"type": "table", "headers": ["Factor", "Intraday trailing", "End-of-day trailing"], "rows": [
            ["Floor updates", "Real time, tick by tick", "Once, after close"],
            ["Counts unrealized profit", "Usually yes", "No - uses closing balance"],
            ["Punishes give-back", "Yes, immediately", "No"],
            ["Best-fit style", "Fast scalps, quick exits", "Runners, scaling, swings"],
            ["Typical difficulty", "Stricter", "More forgiving"]
        ]},
        {"type": "activity", "kind": "checklist", "title": "Drawdown survival checklist", "prompt": "Before your next funded session, confirm you can tick these. Score one point each.", "items": [
            "I know whether my account trails intraday or end-of-day",
            "I know if my floor counts unrealized (open) profit",
            "I have a hard number for how far my floor is from current equity right now",
            "On intraday accounts, I take partials into strength instead of holding full size through retraces",
            "I stop trading for the day once I am within one average trade of the floor",
            "I log the distance-to-floor at the end of every session"
        ], "bands": [
            {"min": 0, "text": "High risk. You could breach without understanding why. Fix the top two items today."},
            {"min": 3, "text": "Getting there. Tighten your give-back rules on intraday accounts."},
            {"min": 5, "text": "Solid. You are trading the rule, not fighting it."}
        ]},
        {"type": "h2", "text": "How to trade each type without tripping the floor"},
        {"type": "p", "text": "On an intraday account, treat open profit as fragile. Bank partials as price extends, tighten stops to protect a chunk of the runner, and remember that the floor already moved up to your peak. On an EOD account, you have more room to let a position work through noise, but you still have to respect the daily loss limit and the overall floor at the close. In both cases the winning habit is the same: know your exact distance to the floor at all times, and size the next trade so a single loss cannot end your account."},
        {"type": "usecase", "text": "How JournalX helps: tag each account with its drawdown type and DD amount, and JournalX tracks your distance-to-floor after every trade. Your equity curve shows where a give-back nearly breached an intraday floor, and your stats reveal whether you consistently give back open profit on winners. That is the exact leak that fails intraday challenges."},
        {"type": "why", "text": "Why JournalX is different: most journals log entry and exit and stop there. JournalX models the rule you are actually trading under, so a funded trader sees the same number the firm sees, before the firm closes the account, not after."},
        {"type": "faqs", "text": ""}
    ],
    "faqs": [
        {"q": "Is end-of-day or intraday trailing drawdown better?", "a": "For most discretionary traders end-of-day is more forgiving, because the floor only moves off your closing balance and intraday give-back does not count. Intraday can suit fast scalpers who close quickly and rarely hold open profit."},
        {"q": "Does the trailing floor include unrealized profit?", "a": "On many intraday models, yes: the floor trails your highest equity including open position gains, so you can breach while still up on the day. End-of-day models use the closing balance instead. Always confirm with your firm's rules."},
        {"q": "Does the trailing floor ever move back down?", "a": "No. A trailing drawdown floor ratchets up as you make profit and then stays put. It never falls, which is why protecting banked progress matters as much as making it."},
        {"q": "How do I stop breaching an intraday drawdown?", "a": "Take partials into strength, avoid holding large unrealized gains through chop, and stop trading once you are within one average trade of the floor. Track your distance-to-floor after every trade."}
    ]
}

post2 = {
    "slug": "mae-and-mfe-trade-journal-metrics-fix-your-exits",
    "title": "MAE and MFE: The Journal Metrics That Fix Your Exits",
    "metaTitle": "MAE and MFE Explained: Fix Your Trade Exits | JournalX",
    "metaDescription": "Maximum adverse and favorable excursion, explained with examples. Learn how MAE and MFE in your trading journal reveal bad stops, early exits, and hidden edge.",
    "keywords": [
        "mae and mfe",
        "maximum adverse excursion",
        "maximum favorable excursion",
        "trade journal metrics",
        "how to improve trade exits",
        "mae mfe trading journal"
    ],
    "category": "Journaling",
    "cover": "/assets/JournalX_Banner.png",
    "minutes": 8,
    "date": DATE,
    "featured": False,
    "excerpt": "Your win rate hides the two numbers that actually explain your exits. MAE and MFE show how much heat you take and how much profit you leave on the table.",
    "helpful": {"up": 39, "down": 1, "saves": 42},
    "tags": ["journaling", "metrics", "exits", "edge"],
    "body": [
        {"type": "p", "text": "Most traders obsess over entries and log almost nothing about the life of the trade in between. That is where the money hides. Two numbers, borrowed from decades of trade analysis, tell you more about your exits than your win rate ever will: Maximum Adverse Excursion and Maximum Favorable Excursion. The concept of MAE traces back to John Sweeney's work on measuring how far a trade moves against you before it works, and it remains one of the most practical things a journal can capture."},
        {"type": "h2", "text": "What MAE and MFE measure"},
        {"type": "p", "text": "Maximum Adverse Excursion (MAE) is the worst unrealized loss a trade shows from entry before it turns around or you close it. It answers: how much heat did I sit through? Maximum Favorable Excursion (MFE) is the best unrealized profit the trade reached before you exited. It answers: how much was on the table at the peak? Buy at $520, watch it dip to $518.50, run to $524, and close at $522, and your MAE is $1.50 while your MFE is $4.00. You captured $2.00 of a $4.00 opportunity and endured $1.50 of pain to do it."},
        {"type": "table", "headers": ["Metric", "What it captures", "The question it answers"], "rows": [
            ["MAE", "Worst drawdown inside the trade", "Is my stop too tight or too loose?"],
            ["MFE", "Peak unrealized profit reached", "Am I exiting too early?"],
            ["MFE - realized", "Profit given back before exit", "How much am I leaving on the table?"],
            ["MAE vs stop", "Heat relative to your stop distance", "Are my stops in the wrong place?"]
        ]},
        {"type": "h2", "text": "Why these two numbers matter"},
        {"type": "p", "text": "Win rate and average R tell you the outcome. MAE and MFE tell you the mechanism. If your winners routinely reach 2R of MFE but you keep booking them at 1R, you have an exit problem, not an entry problem, and no new setup will fix it. If your losers show small MAE but your winners show large MAE, your stop may be sitting exactly where the market likes to shake you out. These are diagnoses you cannot make from a P&L column alone."},
        {"type": "quote", "text": "If your average MFE is far larger than your average realized profit, the market is handing you money and you are declining it at the exit."},
        {"type": "h2", "text": "How to read your MAE distribution"},
        {"type": "p", "text": "Collect MAE across a few dozen trades and a pattern appears. If almost all your winning trades had an MAE under, say, 0.6R, but your stop sits at 1R, you are risking more than the trade needs and could tighten up to improve your risk-to-reward. If many stopped-out losers had MAE that just kissed your stop before the intended direction resumed, your stop is too tight for the noise of that instrument. The goal is to place your stop beyond where healthy trades breathe but inside where broken trades run."},
        {"type": "p", "text": "One caveat: measure MAE against the instrument, not a fixed dollar amount. A tick of noise on a quiet stock is a different thing from a tick on a fast index future. This is why many traders express MAE and MFE in R multiples, where R is the initial risk on the trade. Expressed in R, a 0.5R MAE means the same thing whether you are trading two shares or twenty contracts, and you can compare heat across every instrument and setup on one scale."},
        {"type": "h2", "text": "Using MFE to fix your exits"},
        {"type": "p", "text": "MFE is the antidote to two opposite mistakes: cutting winners early and holding them to zero. Compare your average MFE to your average realized gain. A large gap means you are exiting well before the trade's peak, and a trailing stop or partial-scale plan might capture more. If your realized gains often sit close to MFE but your give-back on losers is large, the leak is on the downside instead. Let the data pick the fix rather than guessing."},
        {"type": "p", "text": "A simple exercise makes this concrete. For your last twenty winners, write down MFE and the R you actually booked. If the average booked figure is roughly half the average MFE, test a plan that takes a partial at your usual target and trails the rest. You are not trying to catch the exact peak every time, which is impossible. You are trying to stop systematically leaving the back half of your best trades on the table."},
        {"type": "activity", "kind": "quiz", "title": "Diagnose the exit leak", "prompt": "Over 40 trades your average MFE is 2.3R but your average realized win is 0.9R, while your losers stop out cleanly near 1R. What is the most likely problem?", "options": [
            "Your entries have no edge",
            "You are exiting winners far too early",
            "Your stops are too tight",
            "Your position size is too small"
        ], "correct": 1, "explain": "A large gap between MFE (2.3R) and realized win (0.9R), with clean stops, points squarely at premature exits. The trades reach profit you are not capturing. A partial-scale or trailing-stop plan usually recovers a chunk of that missing MFE."},
        {"type": "h2", "text": "Common mistakes when using MAE and MFE"},
        {"type": "p", "text": "First, judging on too few trades. A handful of samples is noise; look for patterns across dozens. Second, optimizing MAE and MFE in isolation and forgetting they trade off against each other. A tighter stop lowers your risk but raises your stop-out rate, and the MAE distribution is how you find the balance. Third, recording the numbers and never acting on them. The metric is only useful if it changes where your stop and target go next week."},
        {"type": "usecase", "text": "How JournalX helps: log the peak and trough each trade reached and JournalX plots your MAE and MFE distributions, flags the gap between MFE and your realized exits, and shows whether your stop sits inside or outside where winning trades breathe. You stop guessing about exits and start adjusting from your own data."},
        {"type": "why", "text": "Why JournalX is different: instead of a static spreadsheet cell, JournalX turns MAE and MFE into a picture of your exit behavior over time, so the fix, tighten the stop, trail the runner, scale out, comes from evidence rather than a hunch after one bad day."},
        {"type": "faqs", "text": ""}
    ],
    "faqs": [
        {"q": "What is the difference between MAE and MFE?", "a": "MAE (Maximum Adverse Excursion) is the worst unrealized loss a trade reaches before it recovers or closes. MFE (Maximum Favorable Excursion) is the best unrealized profit it reaches before you exit. MAE measures heat taken; MFE measures opportunity available."},
        {"q": "How does MAE help me place better stops?", "a": "If your winning trades rarely show MAE beyond a fraction of your stop distance, you may be risking more than needed. If losers repeatedly touch your stop before reversing, your stop may be too tight for that instrument's noise. The MAE distribution guides placement."},
        {"q": "How many trades do I need before MAE and MFE are useful?", "a": "Look for patterns across dozens of trades rather than a handful. Small samples are dominated by noise. A few dozen gives a readable distribution you can act on."},
        {"q": "Can MFE tell me if I exit too early?", "a": "Yes. Compare average MFE to your average realized win. A large gap means trades routinely reach profit you are not capturing, which usually points to premature exits that a trailing stop or partial-scale plan can improve."}
    ]
}

new_posts = [p for p in (post1, post2) if p["slug"] not in existing]
skipped = [p["slug"] for p in (post1, post2) if p["slug"] in existing]

valid_cats = {"Strategy", "Risk", "Psychology", "Journaling", "Markets", "Funded"}
valid_types = {"p", "h2", "quote", "usecase", "why", "table", "activity", "faqs"}
req = ["slug", "title", "metaTitle", "metaDescription", "keywords", "category", "cover", "minutes", "date", "featured", "excerpt", "helpful", "tags", "body"]

def wc(p):
    n = 0
    for b in p["body"]:
        if b.get("type") in ("p", "h2", "quote", "usecase", "why"):
            n += len(b.get("text", "").split())
    return n

for p in new_posts:
    for f in req:
        assert f in p, f"missing field {f} in {p['slug']}"
    assert p["category"] in valid_cats, f"bad category {p['category']}"
    md = len(p["metaDescription"])
    assert 145 <= md <= 165, f"metaDescription len {md} for {p['slug']}"
    for b in p["body"]:
        assert b["type"] in valid_types, f"bad block type {b['type']}"
        if b["type"] == "table":
            w = len(b["headers"])
            for r in b["rows"]:
                assert len(r) == w, f"row width mismatch in {p['slug']}"
    print(p["slug"], "| cat:", p["category"], "| words:", wc(p), "| metaDesc:", md)

d["posts"].extend(new_posts)

with open(BLOG, "w", encoding="utf-8") as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write("\n")

# reload to confirm parse
reloaded = json.load(open(BLOG, encoding="utf-8"))
print("SKIPPED:", skipped)
print("ADDED:", [p["slug"] for p in new_posts])
print("NEW TOTAL:", len(reloaded["posts"]))
