# JournalX Mobile (React Native + Expo)

Native app for journalx.app. Phase 0 (foundations) + Phase 1 (auth + data) are
in place. Backend is the same Express API — the app authenticates with a JWT
(Bearer) instead of cookies.

## Run it

```bash
cd journalx_app
npm install
# point the app at your backend (defaults to https://api.journalx.app)
#   set "extra.apiBase" in app.json, or export EXPO_PUBLIC_API_BASE
npx expo start            # press a for Android / i for iOS (Expo Go for quick UI checks)
```

> Native modules used (Google Sign-In, MMKV, Reanimated) require a **dev build**
> for full functionality, not plain Expo Go:
>
> ```bash
> npx expo install expo-dev-client
> npx expo run:android        # builds a dev client on a device/emulator
> ```

## What's implemented

- **Theme** ported from the web tokens (light/dark, `src/theme`).
- **Storage**: MMKV (`src/lib/storage.js`) — the mobile equivalent of IndexedDB
  `user-data`. Token in secure-store (`src/lib/secureStore.js`).
- **Centralized state**: `src/context/AppContext.js` — auth token, userData,
  subscription, refresh/login/logout. Everything funnels through here.
- **Auth** (`src/screens/LoginScreen.js`): password, passwordless email **OTP**,
  and native **Google** sign-in — all reuse existing backend routes and receive
  a JWT.
- **Overview** + **Settings** screens; Settings shows the live **subscription
  status** from the user data, plus theme toggle and logout.
- **Navigation**: auth screen ↔ bottom-tab app shell.

## Backend additions (already made, additive — web untouched)

- `utils/appToken.js` — signs the app JWT (needs `JWT_SECRET` env on the backend).
- `middleware/bearerToCookie.js` — lets the app authenticate protected routes
  via `Authorization: Bearer`.
- Login / verify endpoints now also return `token`.
- `POST /api/auth/google/native` — verifies a Google ID token → app JWT.
- Turnstile is skipped for app clients (header `X-App-Client: 1`); Play
  Integrity will replace it for the app in a later phase.

### Required backend env
- `JWT_SECRET` — set a strong secret (used to sign app tokens).
- (optional) `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_WEB_CLIENT_ID` for stricter
  Google token audience checks.

## Google Sign-In setup (for the app)
1. Google Cloud → Credentials → create an **Android** OAuth client (package
   `app.journalx.mobile` + your signing SHA-1 from EAS).
2. Keep using the **Web** client id as `webClientId` in `app.json`
   (`extra.googleWebClientId`) — that's what produces the ID token the backend
   verifies.

---

## Phase 3 — Google Play Billing (IMPLEMENTED, needs your config)

Built: an **Upgrade screen** (Settings → Upgrade to Pro) that uses
**RevenueCat + Google Play Billing**, plus a backend **webhook** that mirrors
purchases onto the user's subscription fields with `subscriptionSource: "play"`
(so web Paddle and app Play coexist). The app identifies the buyer to
RevenueCat with their Mongo userId, so the webhook matches the right account.
Status is shown from the user data (Settings + Upgrade screen).

### What you need to configure

**Google Play Console**
1. **Monetize → Subscriptions** → create a subscription product (e.g.
   `pro_monthly`) with a monthly auto-renewing **base plan**.
2. Set prices per country (INR/USD) to match the web plans.
3. Create a **service account** with Play Developer API access (for RevenueCat).
4. Add license **testers** for sandbox purchases.

**RevenueCat**
5. Create a project, add the Play app + upload the service-account JSON.
6. Create an **entitlement** named `pro` and attach the `pro_monthly` product;
   put it in the **current Offering** (as the `monthly` package).
7. Copy the RevenueCat **Android public SDK key** → set it in
   `app.json → extra.revenueCatAndroidKey` (replace the placeholder).
8. Add a **Webhook**: URL `https://api.journalx.app/api/payments/revenuecat/webhook`,
   and set its **Authorization header** value to your `REVENUECAT_WEBHOOK_SECRET`.

**Backend env**
- `REVENUECAT_WEBHOOK_SECRET` — same value you put in the RevenueCat webhook
  Authorization header.

**Notes**
- The entitlement name is read from `app.json → extra.proEntitlement` (default
  `pro`). Keep them matching.
- In-app purchases require the **dev/production build** (not Expo Go). The
  Upgrade screen shows a friendly note in Expo Go and works once built.
- Do not point users to web/Paddle payment from inside the app (Play
  anti-steering rules).
