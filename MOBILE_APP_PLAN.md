# JournalX Mobile App — Execution Plan (React Native)

Goal: a React Native app that mirrors the journalx.app web UI/UX but feels
native, with smooth animations, and **monthly subscriptions billed through
Google Play**. Same backend API. Android first (iOS comes nearly free later).

---

## 1. Guiding principle: reuse logic, rebuild UI

- **Reuse (copy into a shared layer):** all pure logic — analytics/metric
  calculations, `planRestrictions`, `plans`, `fx`, `currencySymbol`, date
  helpers, and the API client. These are plain JS, no DOM.
- **Rebuild:** every screen/component. React Native has no HTML/CSS/DOM, so the
  `revampV2` components are recreated with RN primitives (`View`, `Text`,
  `Pressable`) styled from a ported token theme. The *visual design* carries
  over 1:1; the *code* does not.
- Best structure: a monorepo (or shared `packages/core`) holding logic + design
  tokens, consumed by both `web` (Next.js) and `mobile` (RN). If a monorepo is
  too heavy now, start by copying the utils into the RN project.

---

## 2. Tech stack

- **Expo (managed + dev client)** — fastest path, OTA updates, EAS Build for the
  Play Store, supports the native modules we need via config plugins. (Bare RN
  only if we later need something Expo can't plug in — unlikely here.)
- **Animations:** React Native Reanimated 3 + **Moti** (declarative, very close
  to the framer-motion mental model) + Gesture Handler. This is how we get the
  "good animations" feel.
- **Charts:** `@shopify/react-native-skia` for the equity-growth candles and
  custom charts (high performance), with `react-native-svg` for simpler ones.
- **Navigation:** React Navigation — bottom tabs (mirrors the web bottom bar) +
  native stack for modals/flows.
- **Local storage (replaces IndexedDB):** MMKV for fast key-value (settings,
  user-data snapshot), and `expo-sqlite`/WatermelonDB if we want indexed trade
  queries at scale. Start with MMKV mirroring today's `user-data` object.
- **State:** keep it simple — React context + hooks, same as web.

---

## 3. Auth strategy (important change for mobile)

The web uses httpOnly cookies; cookies are fragile in RN. Recommended:
- Add **token-based auth (JWT / bearer)** to the backend *alongside* the
  existing cookie flow. The app stores the token in **expo-secure-store**.
- **Google Sign-In:** native via `@react-native-google-signin` or
  `expo-auth-session` (separate OAuth client of type "Android" in Google Cloud,
  with the app's SHA-1). Backend verifies the Google ID token and issues our JWT.
- **Email/password + OTP login:** reuse the existing endpoints
  (`/login`, `/login-otp/request`, `/login-otp/verify`) — just return a JWT for
  the app instead of (or in addition to) setting the cookie.
- **Captcha:** Cloudflare Turnstile has no clean native widget. Options: (a) skip
  Turnstile on the app and use **Google Play Integrity API** for bot defense, or
  (b) render Turnstile in a small webview. Recommend (a) for app, keep Turnstile
  on web.

---

## 4. Payments — Google Play Billing (the critical piece)

Google **requires** in-app digital subscriptions to use Play Billing (Paddle /
crypto are not allowed for the in-app purchase of the same digital goods). So:

- Use **RevenueCat** (recommended) on top of Play Billing — it handles purchase
  flow, receipt validation, entitlements, renewals, and gives one dashboard +
  webhooks. (`react-native-iap` is the alternative but you build validation
  yourself.)
- **Flow:** user taps Upgrade → RevenueCat/Play purchase sheet → on success,
  RevenueCat marks the "pro" entitlement → a **RevenueCat webhook → our backend**
  updates `subscriptionPlan/Status/Type/ExpiresAt` (same fields Paddle uses).
- **Backend changes:** add a webhook endpoint to receive Play/RevenueCat events
  and a `source` field (`paddle` | `play`) on the subscription so web (Paddle)
  and app (Play) coexist. One user, one subscription state, two possible sources.
- **Play Console setup:** create the monthly subscription product, base plan,
  pricing per country (INR/USD handled by Google), and link the service account
  for server validation.
- **Policy notes:** monthly price must be configured in Play Console; Google's
  cut is ~15% on the first $1M/year per account, ~30% above (verify current
  rates). Be careful with "anti-steering" rules — don't push users to web
  payment from inside the app.

---

## 5. Screen map (web → app)

- Onboarding / guide modal → native carousel (Reanimated).
- Auth: login (password + OTP + Google), register, forgot-password.
- Dashboard / Overview: KPI tiles, equity candles (Skia), session card,
  day-of-week, streaks, analytics — same sections, native layout + the
  Customize show/hide.
- Trades log: list (FlatList) + filters + trade details sheet.
- Log trade: quick + detailed; chart log later.
- Markets, Blog (can reuse content from the same JSON/API), Settings
  (profile, preferences, theme, subscription/upgrade).
- Bottom tab bar mirrors the web bottombar; theme toggle in settings/profile.

---

## 6. Phased roadmap

- **Phase 0 — Foundations (setup):** Expo app, EAS Build, navigation, ported
  design tokens + base components (Button, Card, Input, Badge, Toast), theme
  (light/dark), shared logic/util layer, API client with JWT.
- **Phase 1 — Auth + data:** Google + password + OTP login, secure token
  storage, MMKV `user-data`, fetch/sync from backend.
- **Phase 2 — Core journaling:** journals, log trade (quick + detailed),
  trades log list + details, dashboard overview with charts.
- **Phase 3 — Payments:** RevenueCat + Play Billing, Upgrade screen, backend
  webhook + `source` field, plan gating reused from `planRestrictions`.
- **Phase 4 — Polish:** animations pass (Moti/Reanimated), markets, blog,
  settings, empty/loading states, haptics, app icon/splash.
- **Phase 5 — Store launch:** Play Console listing, data safety form, privacy
  policy, content rating, closed test → production rollout.

---

## 7. Backend changes needed (small, additive)

1. Issue a **JWT** on login endpoints when the client is the app (e.g. an
   `X-Client: app` header or a dedicated `/app/login`), and accept
   `Authorization: Bearer` on protected routes.
2. **RevenueCat/Play webhook** endpoint → update subscription fields.
3. Add `subscriptionSource` (`paddle`|`play`) to the User model.
4. Google **ID-token verification** for native Google Sign-In.
5. Optional: Play Integrity check in place of Turnstile for the app.

---

## 8. Store launch checklist

- Google Play Developer account ($25 one-time).
- App signing via EAS / Play App Signing; capture SHA-1 for the Google OAuth
  Android client.
- Subscription product + base plan + prices per region.
- Privacy policy URL (have it), Data Safety form, content rating, screenshots,
  feature graphic.
- Closed/internal testing track before production.

---

## 9. Key decisions — confirm / add your points

1. **Expo (recommended) vs bare React Native?**
2. **RevenueCat (recommended) vs raw `react-native-iap`** for Play Billing?
3. **Add JWT/bearer auth for the app** (recommended) vs trying to reuse cookies?
4. **Captcha on app:** Play Integrity (recommended) vs Turnstile-in-webview vs
   none?
5. **Monorepo/shared package now** vs copy utils into the RN project first?
6. **Android only** for v1, or set up for iOS too from the start (RN gives it,
   but Apple needs its own StoreKit billing + review)?
7. **Charts:** go straight to Skia (recommended for the candles) or start with a
   lighter SVG lib and upgrade later?

---

## 10. Risks to watch

- **Play Billing + policy** is the biggest unknown — getting the product,
  webhook validation, and anti-steering right takes care.
- **Subscription reconciliation** across Paddle (web) and Play (app) for the
  same user — needs the `source` field and clear precedence rules.
- **Charts performance** on lower-end Android — Skia mitigates this.
- **Auth token migration** — keep web cookies working while adding app JWT.

---

_Your notes below this line:_
