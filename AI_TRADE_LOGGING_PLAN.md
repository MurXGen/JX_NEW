# JournalX — AI-Assisted Trade Logging: Implementation Plan

**Status:** Planning / spec (no code yet)
**Scope of phase 1:** In-app AI assistant that turns **natural language, a screenshot, or voice** into a draft trade the user confirms and saves.
**Phase 2 (later):** JournalX MCP server so power users drive JournalX from their own Claude (the Figma model).

---

## 1. Goal

Let a trader log a trade without filling the form by hand:

- **Type/paste:** "Longed BTC at 63,900, closed 64,650, size 0.2, lost ₹150."
- **Screenshot:** drop a broker P&L screenshot and we read the numbers.
- **Voice:** speak the trade on mobile.

In every case the AI returns a **draft** that pre-fills the existing Log-trade form. The user reviews and saves. The AI never writes a trade silently — human-in-the-loop is mandatory for accuracy and trust, and because money is involved.

This directly reinforces the "I'm too lazy to log, especially losses" problem: the cheapest path becomes "paste a screenshot / say one sentence."

---

## 2. High-level architecture

```
                 ┌─────────────── Frontend (Next.js) ───────────────┐
  user input ───▶│  AI Log entry (text box / image upload / mic)     │
                 │   → POST /api/ai/parse-trade  (text | image | audio)
                 └───────────────────────────┬──────────────────────┘
                                             │
                 ┌───────────── Backend (Express) ──────────────────┐
                 │  /api/ai/parse-trade                             │
                 │   1. auth + plan gate + rate limit               │
                 │   2. (voice) transcribe audio → text             │
                 │   3. call Anthropic Messages API with a          │
                 │      tool schema = trade fields (+ image block)  │
                 │   4. normalize → draft trade(s) in journal cur.  │
                 │   5. return draft(s) + confidence + raw text     │
                 └───────────────────────────┬──────────────────────┘
                                             │ draft
                 ┌─────────────── Frontend ─────────────────────────┐
                 │  Pre-fill Log-trade form / show confirm card     │
                 │  user edits → existing POST /api/trades/addd      │
                 └───────────────────────────────────────────────────┘
```

Key principle: **AI only parses; the existing save path (`/api/trades/addd`) still does the writing.** No new write path, no new trade-validation surface.

---

## 3. The extraction schema (tool / structured output)

We use Anthropic **tool use** (function calling) with one tool, `extract_trades`, whose input schema mirrors the fields the Log-trade modal already sends. The model is forced to return JSON in this shape.

```jsonc
// tool: extract_trades  (model must call this)
{
  "trades": [
    {
      "symbol": "string|null",            // e.g. "BTC/USDT", "NIFTY"
      "direction": "long|short|null",
      "entryPrice": "number|null",
      "exitPrice": "number|null",
      "size": "number|null",              // position size
      "sizeUnit": "asset|usd|null",       // matches Trade.sizeUnit
      "leverage": "number|null",
      "stopLoss": "number|null",
      "takeProfit": "number|null",
      "pnl": "number|null",               // signed; negative = loss
      "fees": "number|null",
      "openTime": "ISO8601|null",
      "closeTime": "ISO8601|null",
      "status": "closed|running|quick|null",
      "strategy": "string|null",
      "marketCondition": "string|null",
      "emotion": "string|null",
      "notes": "string|null",
      "confidence_0_1": "number"          // model's own confidence in this row
    }
  ],
  "needs_clarification": "string|null",   // a question to ask the user if ambiguous
  "currency_detected": "string|null"      // if the text/screenshot shows a currency
}
```

Notes:
- If only P&L is present (e.g. a screenshot showing "-150"), the row maps to a **quick log** (`status: "quick"`, `pnl` only) — same as the one-tap QuickResult flow.
- The backend converts this draft into the FormData fields the existing endpoint expects (`entries/exits/sls/tps` arrays, `avgEntryPrice`, `pnlAfterFee`, etc.), defaulting everything the model didn't fill.
- Amounts are interpreted in the **active journal's currency** (we pass it in the prompt); we do not silently FX-convert.

---

## 4. Backend (Express) — `POST /api/ai/parse-trade`

**Request (multipart or JSON):**
- `mode`: `"text" | "image" | "voice"`
- `text`: string (for text mode, or transcription target)
- `image`: file (broker screenshot, ≤ ~5 MB, jpeg/png)
- `audio`: file (voice mode, webm/m4a)
- `accountId` + `journalCurrency` (so the model knows the currency and we attach the right journal)

**Steps:**
1. **Auth** (existing session cookie) + **plan gate** (see §8) + **rate limit** (e.g. 20/day free, higher for Pro; per-user, in Mongo or Redis).
2. **Voice → text:** transcribe `audio` first (see §7), then treat as text mode.
3. **Build the Anthropic call:**
   - Model: **Claude Haiku** for text (cheap, fast); **a vision-capable Claude** for screenshots.
   - System prompt: "You extract structured trade data for a trading journal. Amounts are in {journalCurrency}. Today is {date}, user timezone {tz}. Only output via the `extract_trades` tool. If you're unsure of a field, leave it null — never guess prices."
   - User content: the text, and for image mode an `image` content block (base64).
   - `tools: [extract_trades]`, `tool_choice: { type: "tool", name: "extract_trades" }`.
4. **Normalize** the tool result → draft trade(s); compute derived bits (R:R, % return) the same way the form does, or leave for the form to compute.
5. **Respond:** `{ drafts: [...], needsClarification, rawText, modelConfidence }`.

**Env / secrets:** `ANTHROPIC_API_KEY` set on the backend host (Railway). The key never touches the frontend. (You set this; I can't enter keys.)

**Failure handling:** if the model returns nothing usable or low confidence, return `needsClarification` so the UI asks a follow-up instead of saving garbage.

---

## 5. Frontend (Next.js) — UX

**Entry points (mobile-first):**
- A new **"Log with AI"** option on the + flow (alongside Quick result / full Log), and/or a small assistant bubble.
- On the QuickResult sheet, a "Paste screenshot / describe it" affordance.

**Interaction:**
1. User types, uploads an image, or taps the mic.
2. Show a lightweight "Reading your trade…" state while `/api/ai/parse-trade` runs.
3. Render the returned draft **as a pre-filled, editable card** (reuse the Log-trade form / a compact confirm card). Highlight any field the model was unsure about; if `needsClarification`, show that question with a quick reply.
4. **User confirms → save via existing `/api/trades/addd`.** Nothing is written before confirm.
5. Multiple trades in one screenshot → show a list of draft rows, each confirmable.

**Reuse:** the draft maps onto `LogTradeModal`'s form state, so we get all existing validation, currency handling, and the save path for free.

---

## 6. Voice pipeline (input mode)

Two options:
- **Cheap / fast:** browser **Web Speech API** (`SpeechRecognition`) does speech-to-text on-device, then send the text to `/api/ai/parse-trade` (text mode). No audio leaves the device; zero extra cost. Limitation: support varies (good on Chrome/Android, weaker on iOS Safari).
- **Robust:** record audio, send to a server-side transcription (e.g. Whisper-class) in the route, then parse. Works everywhere, small extra cost + latency.

Recommendation: **Web Speech API first** with graceful fallback to "type it" where unsupported; add server transcription later if needed.

---

## 7. Screenshot pipeline (input mode)

- Accept jpeg/png, downscale client-side (reuse the existing `compressImage` helper) before upload to cut tokens/cost.
- Send as an image content block to a vision-capable Claude with the same `extract_trades` tool.
- Common broker layouts (Binance, UltraTrader, MT4/5, Zerodha) vary; the tool schema + "leave unsure fields null" prompt keeps it safe. Always land in the **review** step.

---

## 8. Plan gating, cost, rate limits

- **Cost:** text parse on Haiku is a fraction of a cent; vision is a bit more. Negligible per user at sane limits.
- **Gating idea:** Free = a few AI logs/day (e.g. 5); Pro/Lifetime = generous/unlimited. Reuse `getPlanRules(userData)` and add an `aiLogsPerDay` limit; surface "X left today" + an upgrade nudge, mirroring the existing chart-log gating.
- **Rate limit** server-side regardless, to cap abuse/cost.

---

## 9. Security & privacy

- API key stays server-side (env var); never shipped to the client.
- Add a clear, one-time notice: "Your text/screenshot/voice is sent to our AI provider to extract the trade. We don't store the raw input beyond the request." (Confirm actual retention with your provider terms and reflect it in the privacy policy.)
- Don't send anything to the model that the user didn't submit for this purpose.
- Strip obvious PII from screenshots is not feasible pre-send; instead tell users to crop to the trade area.

---

## 10. Edge cases

- Ambiguous currency/decimals (₹ vs $, lakhs) → use journal currency + ask if unsure.
- Relative dates ("yesterday", "this morning") → resolve against user timezone server-side.
- Partial trades / scale-ins → phase 1 collapses to a single entry/exit; multi-entry is a later enhancement.
- Screenshot with several trades → return multiple drafts.
- Low confidence / nonsense → `needsClarification`, never auto-save.

---

## 11. Milestones (phase 1)

1. **Backend route** `POST /api/ai/parse-trade` (text mode only) + `ANTHROPIC_API_KEY` + tool schema + normalization to the existing save shape. *(Testable with curl once the key is set.)*
2. **Frontend "Log with AI" (text):** input → draft → pre-fill Log-trade form → confirm → save.
3. **Screenshot mode:** client compress + image block + multi-draft review UI.
4. **Voice mode:** Web Speech API → text path; fallback messaging.
5. **Gating + rate limit + privacy notice.**
6. **QA:** real broker screenshots (Binance/MT/Zerodha/UltraTrader), messy sentences, wrong-currency cases; confirm nothing saves without review.

---

## 12. Phase 2 (later) — JournalX MCP server (the Figma model)

Expose JournalX over MCP so users connect their own Claude and say "log my trade" / "what's my win rate this week":
- Tools: `create_trade`, `list_trades`, `get_stats`, `get_journals`.
- Auth: OAuth so Claude acts on the user's account; scoped tokens.
- Hosting: a small MCP endpoint (can reuse the Express backend).
- Audience: power users who already use Claude. Complementary to phase 1 and shares the same trade-creation logic.

---

## 13. Decisions needed before building

1. Confirm you'll provision `ANTHROPIC_API_KEY` on Railway (backend).
2. Model choice: default **Haiku** (text) + vision Claude (screenshots) — OK?
3. Free-tier AI-log allowance (e.g. 5/day) and Pro allowance.
4. Voice: start with on-device Web Speech API (recommended) or go straight to server transcription?
5. Privacy copy sign-off + provider data-retention confirmation.
