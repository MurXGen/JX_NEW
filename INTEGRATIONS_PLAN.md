# Broker & platform integrations plan

How to connect outside trading platforms so a trader signs in once and their trades flow into JournalX automatically. Covers the general recipe, then **cTrader** and **Match-Trader** specifically.

Status in the app: both are listed under **Settings → Integrations → Forex & prop-firm platforms** as *In development*. Nothing connects yet.

---

## 1. What already exists (reuse it)

The Binance / Bybit sync is the template. Every new platform plugs into the same pieces:

| Piece | File | Role |
|---|---|---|
| Routes | `backend/routes/integrations.js` | `GET /exchange/status`, `POST /exchange/:id/connect`, `/sync`, `/disconnect` |
| Controller | `backend/controllers/exchangeController.js` | Pro check, rate limit, encrypted storage, dedupe by `externalId`, insert |
| Adapters | `backend/services/exchanges/<id>.js` | `verify<Id>()` + `fetch<Id>Trades()` returning **normalised trades** |
| Secrets | `backend/utils/vault` (`encrypt`, `decrypt`, `keyHint`) | Never store raw tokens or passwords |
| UI list | `frontend/components/revampV2/ExchangeConnectModal.jsx` → `PLATFORMS` | Name, kind, auth type |
| UI screen | `frontend/components/revampV2/SettingsPanel.jsx` (Integrations tab) | Connect / Manage / status |

**Normalised trade** each adapter must return (what `toTradeDoc` expects):

```js
{
  externalId,          // unique per platform + account, used for dedupe
  symbol, direction,   // "long" | "short"
  qty, entry, exit,
  openTime, closeTime, // ISO or ms
  pnl, fees,
  leverage, quantityUSD,
}
```

---

## 2. General recipe for any new platform

1. **Get access.** Register a developer app or sign a partner agreement (see each platform below). Put the credentials in backend env vars, never in the frontend.
2. **Pick the sign-in method.**
   - **OAuth (best):** the trader clicks Connect, logs in on the platform's page and approves read access. We receive a token. No passwords touch JournalX.
   - **Platform login / one-time token:** the trader enters their platform login, or we receive a single-use token from the broker. Store only the resulting session or refresh token, encrypted.
   - **Read-only API key:** what Binance and Bybit use.
3. **Write the adapter** `backend/services/exchanges/<id>.js`:
   - `verify<Id>(creds)` → returns the account list or throws `{ code: "AUTH" }`
   - `fetch<Id>Trades(creds, { since })` → normalised closed trades, paginated
4. **Register it** in the `EXCHANGES` map in `exchangeController.js`. For OAuth, add two routes: `GET /integrations/<id>/auth-url` and `GET /integrations/<id>/callback`.
5. **Account mapping.** One platform login can hold several trading accounts, which matters for prop firms. Let the trader pick which journal each account syncs into, and store `{ platformAccountId → journalId }`.
6. **Sync.** First sync pulls the last 90 days. After that, run incremental sync from `lastSyncAt` using the existing cron in `backend/jobs`, with a manual "Sync now" button. Dedupe on `externalId`.
7. **Token lifecycle.** Refresh before expiry. On a refresh failure, mark the connection "Reconnect needed" in the UI and email the trader once.
8. **UI.** Change the platform's `PLATFORMS` entry from *In development* to a Connect button. Show the connected account, last sync time, and Sync now / Disconnect.
9. **Security and compliance.**
   - Read-only scopes only.
   - Encrypt credentials at rest.
   - Never log tokens.
   - Disconnect wipes credentials.
   - Update the privacy policy to name the platform.
10. **Testing.** Use the platform's demo or sandbox environment first. Cover: first sync, incremental sync, duplicates, partial closes, a symbol with no P&L, an expired token, and a revoked consent.

---

## 3. cTrader (Spotware Open API)

**Access model:** public OAuth 2.0 developer program. Any cTrader ID user can approve our app, which makes it the easiest to launch.

1. **Register the app** at the Open API portal, <https://openapi.ctrader.com/>, signed in with a cTrader ID.
   - Add redirect URIs: `https://api.journalx.app/api/integrations/ctrader/callback`, plus a localhost URI for development.
   - Wait for approval, then note the **Client ID** and **Client Secret**. Store them as `CTRADER_CLIENT_ID` and `CTRADER_CLIENT_SECRET`.
2. **Connect button** → backend builds the authorization URL (client id, redirect URI, `scope=accounts` for read access, and a `state` value tied to the user) → the trader logs in and approves.
3. **Callback** → exchange the `code` for an **access token + refresh token**. Store both encrypted, along with the expiry.
4. **Open a session** to the Open API server (live and demo hosts) and send:
   - `ProtoOAApplicationAuthReq` (client id + secret)
   - `ProtoOAGetAccountListByAccessTokenReq` → lists the trader's accounts; let them choose which to sync
   - `ProtoOAAccountAuthReq` for each chosen account
5. **Fetch history** with `ProtoOADealListReq` (`ctidTraderAccountId`, `fromTimestamp`, `toTimestamp` in Unix ms, `maxRows`).
   - Page through in time windows.
   - Closing deals carry the realised P&L. Group them by `positionId` to build one trade per closed position, and include commission and swap in the fees.
6. **Symbols:** resolve `symbolId` → name with `ProtoOASymbolsListReq` and cache per account.
7. **Refresh:** use `ProtoOARefreshTokenReq` (or the token endpoint) before the access token expires.
8. **Adapter:** `backend/services/exchanges/ctrader.js`. There are Node libraries for the Protobuf messages. Spotware's official SDKs are Python and .NET, so a small Python worker is an option if the Node route is painful.

To verify: the exact token endpoint, scopes, token lifetime, and whether a JSON transport is offered alongside Protobuf. Online examples use Protobuf, and one forum thread reports an empty deal list for some accounts, so test with real demo accounts early.

---

## 4. Match-Trader (Match-Trade Technologies)

**Access model:** broker- and prop-firm-hosted. Each broker or prop firm runs its own Match-Trader server. There is no single public OAuth for all users, so access goes through **Match-Trade** or the **individual broker / prop firm**.

1. **Talk to Match-Trade** (partnerships / support). Ask for third-party read-only access for a trading journal. Be specific about:
   - The auth flow they allow, for example *login with one-time token* (`/manager/login/co/with-token` plus refresh).
   - A **trade history / closed positions** endpoint. The public Platform API docs show *open positions* and order actions, but we did not find a history route.
   - Whether it's per-broker (a list of server URLs) or central.
2. **Alternatively, partner with prop firms directly.** Prop firms on Match-Trader can issue tokens to their traders or push closed trades to a JournalX webhook. This is often the faster route and a growth channel.
3. **Sign-in UX:** the trader picks their broker or prop firm from a list (each with its server URL), then either:
   - signs in with their Match-Trader login, which we exchange for a token and never store as a password, or
   - pastes a one-time token generated in the broker's portal.

   Store the platform URL plus the encrypted token. The trading API token goes in the `Auth-trading-api` header.
4. **Fetch history** via the closed-positions / history endpoint Match-Trade confirms. Map it to the normalised trade, using the position id as `externalId`.
5. **Adapter:** `backend/services/exchanges/matchtrader.js`. Keep a `BROKERS` registry of `{ id, name, baseUrl }` so new prop firms are configuration, not code.

To verify with Match-Trade before building: the history endpoint, token lifetime and refresh, rate limits, terms for third-party apps, and which brokers have the API enabled.

---

## 5. Suggested order

1. **cTrader first.** It's public OAuth: register the app, then build the adapter and the OAuth routes.
2. **Match-Trader in parallel, on the business side.** Email Match-Trade and two or three prop firms that use it. Build once the access model is confirmed.
3. **Then MT4/MT5** (statement upload or a MetaApi-style bridge), Tradovate, and OANDA, using the same recipe.

## 6. Done when

- The trader clicks Connect → approves → picks accounts → sees their last 90 days of trades in the journal in under a minute.
- New trades appear automatically (cron) or with Sync now, and nothing is duplicated.
- Disconnect removes all stored credentials.
- It works on demo and live accounts and is covered by tests.

### Sources

- cTrader Open API portal: <https://openapi.ctrader.com/>
- `ProtoOADealListReq` reference (StockSharp mirror): <https://doc.stocksharp.com/en/api/StockSharp.cTrader.Native.Model.ProtoOADealListReq>
- cTrader community, closed trades via deal list: <https://community.ctrader.com/forum/connect-api-support/24274/>
- Match-Trader Platform API (PDF): <https://docs.match-trade.com/wp-content/uploads/2024/04/MTR-Match-TraderPlatformAPI.pdf>
- Match-Trade Platform API docs: <https://app.theneo.io/match-trade/platform-api>
- Match-Trade Broker API FAQ: <https://app.theneo.io/match-trade/broker-api/faq>
