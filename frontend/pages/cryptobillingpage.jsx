"use client";

/* Crypto checkout (USDT), v3.
   Three clear steps on one page, like a real crypto checkout:
     1. Network  – pick the chain you'll send on (fee / speed hints)
     2. Send     – QR + exact amount + deposit address, each copyable; a short
                   checklist must be ticked before "I've sent it"
     3. Verify   – paste the transaction hash (format-checked per network, with
                   an explorer link). Submitting creates the order (hash attached
                   for the admin check) and starts the same polling as before.
   Order creation, verification polling, timeouts and localStorage keys are
   unchanged from v2. */

import axios from "axios";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardPaste, Clock, Copy,
  ExternalLink, Loader2, Mail, RefreshCw, ShieldCheck, Wallet,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import c from "@/components/app/Crypto.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const NETWORKS = [
  { id: "trc20", name: "Tron", tag: "TRC20", symbol: "TRX", color: "#ef0027", fee: "Low fee", speed: "~1 min", hint: "Most popular for USDT" },
  { id: "bep20", name: "BNB Smart Chain", tag: "BEP20", symbol: "BNB", color: "#f0b90b", fee: "Low fee", speed: "~1 min" },
  { id: "sol", name: "Solana", tag: "SPL", symbol: "SOL", color: "#14f195", fee: "Very low fee", speed: "Seconds" },
  { id: "ton", name: "Toncoin", tag: "TON", symbol: "TON", color: "#0098ea", fee: "Low fee", speed: "Seconds" },
  { id: "avaxc", name: "Avalanche", tag: "C-Chain", symbol: "AVAX", color: "#e84142", fee: "Low fee", speed: "Seconds" },
  { id: "erc20", name: "Ethereum", tag: "ERC20", symbol: "ETH", color: "#627eea", fee: "Higher fee", speed: "~2–5 min" },
];

const NETWORK_ADDRESSES = {
  erc20: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  trc20: "TV1R4rhR8xJYZD1axRiKoHN2bAsn8SJwaN",
  bep20: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  avaxc: "0x26013fc3db5eac1c4ff6cf28a107eca908f2f35f",
  sol: "bvy3Ye5ZDMfpGDkwpnKSAbBbPybWJfaEYQkK3w8DcZt",
  ton: "UQAGm_9b3_y6hjIshL2A-XZ36Cp7RW_tOX3NoVnxdOA94S-Z",
};

/* transaction-hash shape per chain, so typos are caught before submitting */
const TX_RULES = {
  erc20: { re: /^0x[a-fA-F0-9]{64}$/, example: "0x followed by 64 hex characters" },
  bep20: { re: /^0x[a-fA-F0-9]{64}$/, example: "0x followed by 64 hex characters" },
  avaxc: { re: /^0x[a-fA-F0-9]{64}$/, example: "0x followed by 64 hex characters" },
  trc20: { re: /^[a-fA-F0-9]{64}$/, example: "64 hex characters (no 0x)" },
  sol: { re: /^[1-9A-HJ-NP-Za-km-z]{80,90}$/, example: "an 87–88 character signature" },
  ton: { re: /^([a-fA-F0-9]{64}|[A-Za-z0-9+/_-]{43,44}=?)$/, example: "a 64-character hash" },
};
const EXPLORERS = {
  erc20: "https://etherscan.io/tx/",
  trc20: "https://tronscan.org/#/transaction/",
  bep20: "https://bscscan.com/tx/",
  avaxc: "https://snowtrace.io/tx/",
  sol: "https://solscan.io/tx/",
  ton: "https://tonviewer.com/transaction/",
};

const short = (a) => (a && a.length > 18 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

export default function CryptoBillingPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [stage, setStage] = useState("network"); // network | send | verify
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copied, setCopied] = useState(""); // "amount" | "address" | ""
  const [checks, setChecks] = useState({ net: false, amt: false });
  const [txHash, setTxHash] = useState("");
  const [noHash, setNoHash] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("selecting"); // selecting | processing | failed | success
  const [processingTime, setProcessingTime] = useState(300);
  const [cryptoOrderId, setCryptoOrderId] = useState("");
  const [planData, setPlanData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // read the plan from the address bar once the page is in the browser; this
  // works for direct links and refreshes, not just in-app navigation
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pn = p.get("planName"), pd = p.get("period"), am = p.get("amount");
    if (!pn || !pd || !am) {
      router.push("/pricing");
      return;
    }
    setPlanData({ planName: pn, period: pd, amount: am });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPlanDisplayName = () => {
    if (!planData) return "";
    const { planName: pn, period: pd } = planData;
    if (pd === "lifetime" || pn === "Lifetime") return "Lifetime Access";
    if (pd === "monthly") return `${pn} Monthly`;
    if (pd === "yearly") return `${pn} Yearly`;
    return `${pn} Plan`;
  };

  const goSuccess = (orderId) => {
    setPaymentStatus("success");
    const params = new URLSearchParams({
      planName: planData?.planName || "",
      period: planData?.period || "",
      amount: planData?.amount || "",
      method: "crypto",
      orderId,
      isLifetime: planData?.period === "lifetime" ? "true" : "false",
    }).toString();
    router.push(`/subscription-success?${params}`);
  };

  // 5-minute countdown + verification every 10s (unchanged logic)
  useEffect(() => {
    if (paymentStatus !== "processing") return undefined;
    const startTime = Date.now();
    const totalTime = 300;
    localStorage.setItem("cryptoPaymentInitiated", startTime.toString());

    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setProcessingTime(Math.max(totalTime - elapsed, 0));

      if (elapsed % 10 === 0 && elapsed > 0) {
        try {
          const storedOrderId = localStorage.getItem("cryptoOrderId");
          if (!storedOrderId) return;
          const res = await axios.post(`${API_BASE}/api/crypto-payments/verify-payment`, { orderId: storedOrderId }, { withCredentials: true });
          if (res.data.success) {
            clearInterval(interval);
            goSuccess(storedOrderId);
          }
        } catch (err) {
          console.error("Verification error:", err);
        }
      }
      if (elapsed >= totalTime) {
        clearInterval(interval);
        handlePaymentTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, planData, router]);

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const pasteHash = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setTxHash(t.trim());
    } catch {
      setErrorMessage("Couldn't read the clipboard. Paste the hash into the box instead.");
    }
  };

  const createCryptoOrder = async () => {
    if (!planData) throw new Error("Plan data not available");
    const { planName: pn, period: pd, amount: am } = planData;
    const now = new Date();
    const expiry = new Date(now);
    if (pd === "lifetime") expiry.setFullYear(expiry.getFullYear() + 100);
    else if (pd === "yearly") expiry.setFullYear(expiry.getFullYear() + 1);
    else expiry.setMonth(expiry.getMonth() + 1);

    const requestData = {
      planName: pn,
      period: pd,
      amount: am,
      network: selectedNetwork,
      currency: "USDT",
      startAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      ...(txValid ? { txHash: txHash.trim() } : {}),
    };

    try {
      const response = await axios.post(`${API_BASE}/api/crypto-payments/create-order`, requestData, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      if (!response.data.success) throw new Error(response.data.message || "Failed to create order");
      localStorage.setItem("cryptoOrderId", response.data.orderId);
      localStorage.setItem("cryptoPaymentStart", now.toISOString());
      localStorage.setItem("cryptoPaymentExpiry", expiry.toISOString());
      localStorage.setItem("isLifetimePlan", pd === "lifetime" ? "true" : "false");
      return response.data.orderId;
    } catch (error) {
      let errorMsg = "Failed to create payment order";
      if (error.response) errorMsg = error.response.data?.message || `Server error: ${error.response.status}`;
      else if (error.request) errorMsg = "No response from server. Please check your connection.";
      setErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handlePaymentTimeout = () => {
    setPaymentStatus("failed");
    localStorage.removeItem("cryptoPaymentInitiated");
    localStorage.removeItem("cryptoOrderId");
    localStorage.removeItem("isLifetimePlan");
  };

  const handleVerifyPayment = async () => {
    try {
      setPaymentStatus("processing");
      setProcessingTime(300);
      setErrorMessage("");
      const orderId = await createCryptoOrder();
      if (!orderId) throw new Error("Order ID not received from server");
      setCryptoOrderId(orderId);
      localStorage.setItem("cryptoOrderId", orderId);
      localStorage.setItem("cryptoPaymentInitiated", "true");

      const interval = setInterval(async () => {
        try {
          const res = await axios.post(`${API_BASE}/api/crypto-payments/verify-payment`, { orderId }, { withCredentials: true });
          if (res.data.success) {
            clearInterval(interval);
            goSuccess(orderId);
          }
        } catch (err) {
          console.error("Polling verification error:", err);
        }
      }, 60000);
      setTimeout(() => {
        clearInterval(interval);
        handlePaymentTimeout();
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("Payment verification failed:", err);
      setErrorMessage(err.message);
      setPaymentStatus("failed");
    }
  };

  const net = NETWORKS.find((n) => n.id === selectedNetwork);
  const address = selectedNetwork ? NETWORK_ADDRESSES[selectedNetwork] : "";
  const rule = TX_RULES[selectedNetwork];
  const txTrim = txHash.trim();
  const txValid = !!(rule && rule.re.test(txTrim));
  const txBad = txTrim.length > 0 && !txValid;
  const canSubmit = txValid || (noHash && txTrim.length === 0);
  const stepIdx = paymentStatus !== "selecting" ? 3 : stage === "verify" ? 3 : stage === "send" ? 2 : 1;
  const mmss = useMemo(() => `${Math.floor(processingTime / 60)}:${String(processingTime % 60).padStart(2, "0")}`, [processingTime]);

  const fade = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2 } };

  if (!planData) {
    return (
      <div className={c.loading}><Loader2 size={18} className={c.spin} /> Loading checkout…</div>
    );
  }

  // chain badge: the ticker is sized to always fit inside the circle
  const Badge = ({ n, size = 36 }) => {
    const k = n.symbol.length >= 4 ? 0.27 : n.symbol.length === 3 ? 0.31 : 0.38;
    return (
      <span className={c.badge} style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * k)), background: `${n.color}1f`, color: n.color, borderColor: `${n.color}55` }} aria-hidden="true">
        {n.symbol}
      </span>
    );
  };
  // USDT token with the network shown as a small chip, like a wallet does
  const TokenMark = ({ n, size = 34 }) => (
    <span className={c.token} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path fill="#fff" d="M17.9 17.2v0c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1v0c-3.7-.2-6.5-.8-6.5-1.6s2.8-1.4 6.5-1.6v2.5c.2 0 .9.1 1.9.1 1.2 0 1.8-.1 1.9-.1v-2.5c3.7.2 6.4.8 6.4 1.6s-2.8 1.4-6.4 1.6m0-3.4v-2.3h5.2V8H8.9v3.5h5.2v2.3c-4.2.2-7.4 1-7.4 2s3.2 1.8 7.4 2v7.2h3.8v-7.2c4.2-.2 7.3-1 7.3-2s-3.1-1.8-7.3-2" />
      </svg>
      <span className={c.tokenChip} style={{ background: n.color }}>{n.symbol.slice(0, 1)}</span>
    </span>
  );

  return (
    <div className={c.page}>
      <div className={c.wrap}>
        {/* header */}
        <header className={c.head}>
          <button type="button" className={c.back} onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Pay with USDT</h1>
            <p>{getPlanDisplayName()} · {planData.amount} USDT</p>
          </div>
        </header>

        {/* stepper */}
        <ol className={c.steps} aria-label="Checkout steps">
          {["Network", "Send USDT", "Verify"].map((l, i) => {
            const n = i + 1;
            const done = n < stepIdx || paymentStatus === "success";
            const active = n === stepIdx && paymentStatus !== "success";
            return (
              <li key={l} data-done={done || undefined} data-active={active || undefined} aria-current={active ? "step" : undefined}>
                <span>{done ? <Check size={13} /> : n}</span>{l}
              </li>
            );
          })}
        </ol>

        <div className={c.grid}>
          <main className={c.main}>
            <AnimatePresence mode="wait">
              {/* ---------- 1. network ---------- */}
              {paymentStatus === "selecting" && stage === "network" && (
                <motion.section key="network" className={c.card} {...fade} aria-labelledby="cb-net">
                  <h2 id="cb-net">Choose a network</h2>
                  <p className={c.lead}>Use the same network in your wallet or exchange when you withdraw. Sending on a different network loses the funds.</p>
                  <div className={c.nets} role="radiogroup" aria-labelledby="cb-net">
                    {NETWORKS.map((n) => (
                      <button key={n.id} type="button" role="radio" aria-checked={selectedNetwork === n.id} className={c.net} onClick={() => { setSelectedNetwork(n.id); setTxHash(""); }}>
                        <Badge n={n} size={40} />
                        <span className={c.netTxt}>
                          <b>{n.name} <i>{n.tag}</i></b>
                          <small>{n.fee} · {n.speed}</small>
                        </span>
                        {n.hint && <em className={c.netHint}>{n.hint}</em>}
                        <span className={c.radio} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <div className={c.actions}>
                    <button type="button" className={c.primary} disabled={!selectedNetwork} onClick={() => setStage("send")}>
                      Continue <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* ---------- 2. send ---------- */}
              {paymentStatus === "selecting" && stage === "send" && net && (
                <motion.section key="send" className={c.card} {...fade} aria-labelledby="cb-send">
                  <div className={c.cardTop}>
                    <h2 id="cb-send">Send exactly {planData.amount} USDT</h2>
                    <button type="button" className={c.link} onClick={() => setStage("network")}>Change network</button>
                  </div>
                  <div className={c.netPill}><TokenMark n={net} size={30} /><span><b>USDT</b> on {net.name} <i>{net.tag}</i></span></div>

                  <div className={c.sendGrid}>
                    <div className={c.qr}>
                      <QRCodeSVG value={address} size={168} level="M" marginSize={1} bgColor="#ffffff" fgColor="#0b0b0c" title={`Deposit address on ${net.name}`} />
                      <small>Scan with your wallet</small>
                    </div>
                    <div className={c.fields}>
                      <div className={c.field}>
                        <span className={c.lbl}>Amount</span>
                        <div className={c.copyRow}>
                          <b className={c.amount}>{planData.amount} <small>USDT</small></b>
                          <button type="button" className={c.copyBtn} onClick={() => copy(String(planData.amount), "amount")} aria-label="Copy amount">
                            {copied === "amount" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                          </button>
                        </div>
                        <small className={c.help}>Add the network fee on top, so we receive the full {planData.amount} USDT.</small>
                      </div>
                      <div className={c.field}>
                        <span className={c.lbl}>Deposit address</span>
                        <div className={`${c.copyRow} ${c.addrRow}`}>
                          <code className={c.addr}>{address}</code>
                          <button type="button" className={c.copyBtn} onClick={() => copy(address, "address")} aria-label="Copy address">
                            {copied === "address" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                          </button>
                        </div>
                        <small className={c.help}>Check the first and last 4 characters after pasting: <b>{address.slice(0, 4)}…{address.slice(-4)}</b></small>
                      </div>
                    </div>
                  </div>

                  <fieldset className={c.checks}>
                    <legend>Before you send</legend>
                    <label>
                      <input className={c.cb} type="checkbox" checked={checks.net} onChange={(e) => setChecks((s) => ({ ...s, net: e.target.checked }))} />
                      <span>I&apos;m sending <b>USDT</b> on <b>{net.name} ({net.tag})</b>, not another coin or network</span>
                    </label>
                    <label>
                      <input className={c.cb} type="checkbox" checked={checks.amt} onChange={(e) => setChecks((s) => ({ ...s, amt: e.target.checked }))} />
                      <span>I&apos;m sending at least <b>{planData.amount} USDT</b> after fees</span>
                    </label>
                  </fieldset>

                  <div className={c.actions}>
                    <button type="button" className={c.primary} disabled={!checks.net || !checks.amt} onClick={() => { setErrorMessage(""); setStage("verify"); }}>
                      I&apos;ve sent the payment <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    {(!checks.net || !checks.amt) && <small className={c.gateHint}>Tick both checks above to continue</small>}
                  </div>
                </motion.section>
              )}

              {/* ---------- 3. verify ---------- */}
              {paymentStatus === "selecting" && stage === "verify" && net && (
                <motion.section key="verify" className={c.card} {...fade} aria-labelledby="cb-ver">
                  <div className={c.cardTop}>
                    <h2 id="cb-ver">Confirm your transfer</h2>
                    <button type="button" className={c.link} onClick={() => setStage("send")}>Back to address</button>
                  </div>
                  <p className={c.lead}>Paste the transaction hash (TxID) from your wallet or exchange&apos;s withdrawal history. It lets us match your payment straight away.</p>

                  <div className={c.field}>
                    <label className={c.lbl} htmlFor="cb-tx">Transaction hash</label>
                    <div className={`${c.txBox} ${txValid ? c.ok : ""} ${txBad ? c.bad : ""}`}>
                      <input
                        id="cb-tx"
                        value={txHash}
                        onChange={(e) => { setTxHash(e.target.value); setNoHash(false); }}
                        placeholder={net.id === "trc20" ? "e.g. 3f9c…a71b" : net.id === "sol" ? "e.g. 5Gk2…9xQw" : "e.g. 0x3f9c…a71b"}
                        spellCheck={false}
                        autoComplete="off"
                        aria-invalid={txBad || undefined}
                        aria-describedby="cb-tx-help"
                      />
                      {txValid ? <CheckCircle2 size={18} className={c.okIco} aria-hidden="true" /> : (
                        <button type="button" className={c.pasteBtn} onClick={pasteHash}><ClipboardPaste size={14} aria-hidden="true" /> Paste</button>
                      )}
                    </div>
                    <small id="cb-tx-help" className={`${c.help} ${txBad ? c.badTxt : txValid ? c.okTxt : ""}`}>
                      {txValid ? (
                        <>Looks right for {net.tag}. <a href={`${EXPLORERS[net.id]}${txTrim}`} target="_blank" rel="noopener noreferrer">View on explorer <ExternalLink size={12} aria-hidden="true" /><span className={c.sr}>(opens in a new tab)</span></a></>
                      ) : txBad ? `That doesn't look like a ${net.tag} hash. Expected ${rule.example}.` : `A ${net.tag} hash is ${rule.example}.`}
                    </small>
                  </div>

                  <label className={c.skip}>
                    <input className={c.cb} type="checkbox" checked={noHash} onChange={(e) => { setNoHash(e.target.checked); if (e.target.checked) setTxHash(""); }} />
                    <span>I don&apos;t have the hash yet. Verify by amount and address (can take longer).</span>
                  </label>

                  {errorMessage && <p className={c.err} role="alert"><AlertCircle size={15} aria-hidden="true" /> {errorMessage}</p>}

                  <div className={c.actions}>
                    <button type="button" className={c.primary} disabled={!canSubmit} onClick={handleVerifyPayment}>
                      <ShieldCheck size={16} aria-hidden="true" /> Verify payment
                    </button>
                    {!canSubmit && <small className={c.gateHint}>{txBad ? "Fix the hash above to continue" : "Paste a hash, or tick “I don’t have the hash yet”"}</small>}
                  </div>
                </motion.section>
              )}

              {/* ---------- processing ---------- */}
              {paymentStatus === "processing" && (
                <motion.section key="proc" className={c.card} {...fade} aria-live="polite">
                  <div className={c.procHead}>
                    <span className={c.scanner}><ShieldCheck size={22} aria-hidden="true" /></span>
                    <div className={c.procTxt}>
                      <h2>Checking for your transfer</h2>
                      <p className={c.lead}>Keep this page open. Most {net?.tag} transfers confirm within a few minutes.</p>
                    </div>
                    <span className={c.timer}><Clock size={13} aria-hidden="true" /> {mmss}</span>
                  </div>
                  <div className={c.bar}><i style={{ width: `${Math.max(4, Math.min(100, ((300 - processingTime) / 300) * 100))}%` }} /></div>
                  <ul className={c.status}>
                    <li data-done={!!cryptoOrderId || undefined} data-active={!cryptoOrderId || undefined}>
                      <span>{cryptoOrderId ? <Check size={13} /> : <Loader2 size={13} className={c.spin} />}</span>
                      <div><b>Order created</b>{cryptoOrderId && <small>Ref {short(String(cryptoOrderId))}</small>}</div>
                    </li>
                    <li data-done={(cryptoOrderId && txValid) || undefined}>
                      <span>{txValid ? <Check size={13} /> : <i />}</span>
                      <div><b>{txValid ? "Transaction hash attached" : "Matching by amount and address"}</b><small>{txValid ? short(txTrim) : `${planData.amount} USDT to ${short(address)}`}</small></div>
                    </li>
                    <li data-active={!!cryptoOrderId || undefined}>
                      <span>{cryptoOrderId ? <Loader2 size={13} className={c.spin} /> : <i />}</span>
                      <div><b>Waiting for network confirmation</b><small>We check again every 10 seconds</small></div>
                    </li>
                    <li>
                      <span><i /></span>
                      <div><b>Activate {getPlanDisplayName()}</b><small>Happens automatically once confirmed</small></div>
                    </li>
                  </ul>
                  {txValid && (
                    <a className={c.explorer} href={`${EXPLORERS[net.id]}${txTrim}`} target="_blank" rel="noopener noreferrer">
                      Track it on the explorer <ExternalLink size={13} aria-hidden="true" /><span className={c.sr}>(opens in a new tab)</span>
                    </a>
                  )}
                </motion.section>
              )}

              {/* ---------- failed ---------- */}
              {paymentStatus === "failed" && (
                <motion.section key="fail" className={`${c.card} ${c.failCard}`} {...fade} role="alert">
                  <AlertCircle size={28} className={c.failIco} aria-hidden="true" />
                  <h2>We haven&apos;t seen your payment yet</h2>
                  <p className={c.lead}>{errorMessage || "Confirmations can be slow on busy networks. If you've sent it, your order is saved and we'll activate your plan as soon as it lands, or contact us with your transaction hash."}</p>
                  <div className={c.actions}>
                    <button type="button" className={c.secondary} onClick={() => { setPaymentStatus("selecting"); setStage("verify"); setErrorMessage(""); }}>
                      <RefreshCw size={15} aria-hidden="true" /> Check again
                    </button>
                    <a className={c.secondary} href={`mailto:support@journalx.app?subject=${encodeURIComponent("Crypto payment check")}&body=${encodeURIComponent(`Order: ${cryptoOrderId || "n/a"}\nNetwork: ${net?.tag || ""}\nTx hash: ${txTrim || "n/a"}\n`)}`}>
                      <Mail size={15} aria-hidden="true" /> Email support
                    </a>
                  </div>
                </motion.section>
              )}

              {/* ---------- success (redirect follows) ---------- */}
              {paymentStatus === "success" && (
                <motion.section key="ok" className={`${c.card} ${c.okCard}`} {...fade} role="status">
                  <CheckCircle2 size={40} className={c.okBig} aria-hidden="true" />
                  <h2>Payment confirmed</h2>
                  <p className={c.lead}>Your {getPlanDisplayName()} is active. Taking you to your dashboard…</p>
                </motion.section>
              )}
            </AnimatePresence>
          </main>

          {/* summary */}
          <aside className={c.summary} aria-label="Order summary">
            <span className={c.sumLbl}>Order summary</span>
            <div className={c.sumPlan}>
              <span className={c.sumIco}><Wallet size={18} aria-hidden="true" /></span>
              <div>
                <b>{getPlanDisplayName()}</b>
                <small>{planData.period === "lifetime" ? "One-time payment · never expires" : `Billed ${planData.period}`}</small>
              </div>
            </div>
            <dl className={c.sumRows}>
              <div><dt>Network</dt><dd>{net ? `${net.name} (${net.tag})` : "Not chosen"}</dd></div>
              <div><dt>Network fee</dt><dd>Paid by you</dd></div>
              <div className={c.sumTotal}><dt>Total</dt><dd>{planData.amount} USDT</dd></div>
            </dl>
            <ul className={c.sumNotes}>
              <li><ShieldCheck size={14} aria-hidden="true" /> Verified on-chain against your order</li>
              <li><Check size={14} aria-hidden="true" /> Plan activates automatically</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
