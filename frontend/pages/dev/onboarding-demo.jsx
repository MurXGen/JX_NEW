/* Dev-only walkthrough of the first-run onboarding with mock data.
   No API calls. Returns 404 in production builds. */
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import FirstRunFlow from "@/components/authFlow/FirstRunFlow";

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
}

const ACCOUNT = { _id: "demo-journal", name: "Default Journal", currency: "USD", startingBalance: { amount: 0 } };

export default function OnboardingDemo() {
  const router = useRouter();
  const [step, setStep] = useState("journal");
  const [account, setAccount] = useState(ACCOUNT);
  const [trades, setTrades] = useState([]);
  const [done, setDone] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#f5f6f8", fontFamily: "Poppins, sans-serif", display: "grid", placeItems: "center" }}>
      <Head><title>Onboarding demo</title><meta name="robots" content="noindex" /></Head>
      {done && (
        <div style={{ textAlign: "center" }}>
          <p>Onboarding finished, the user lands on the dashboard.</p>
          <button type="button" onClick={() => { setDone(false); setTrades([]); setAccount(ACCOUNT); setStep("journal"); }}
            style={{ marginTop: 12, padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,.15)", background: "#0e0e10", color: "#fff", cursor: "pointer", font: "600 14px Poppins" }}>
            Replay demo
          </button>
        </div>
      )}
      <FirstRunFlow
        demo
        open={!done}
        step={step}
        account={account}
        trades={trades}
        onStepChange={setStep}
        onTradeLogged={(trade) => setTrades((prev) => [...prev, trade])}
        onJournalSaved={async ({ name, currency, balance }) => setAccount((a) => ({ ...a, name, currency, startingBalance: { amount: balance } }))}
        onFinish={() => router.push("/dashboard")}
      />
    </div>
  );
}
