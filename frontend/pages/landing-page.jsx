// pages/index.jsx
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        {/* ✅ SEO Essentials */}
        <title>JournalX | Smart Trading Journal & AI Insights</title>
        <meta
          name="description"
          content="JournalX helps traders log, analyze, and improve their trades using AI insights and performance analytics."
        />
        <meta
          name="keywords"
          content="Trading journal, Trade analytics, AI trade analysis, JournalX, Trading performance tracker"
        />
        <meta property="og:title" content="JournalX | Smart Trading Journal" />
        <meta
          property="og:description"
          content="Track your trades, get AI insights, and boost performance with JournalX."
        />
        <meta property="og:image" content="/journalx-og.png" />
        <meta property="og:url" content="https://journalx.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://journalx.app/" />
      </Head>

      {/* ✅ Page Content */}
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
        {/* HERO SECTION */}
        <section className="text-center py-24 px-6 max-w-4xl">
          <h1 className="text-5xl font-bold mb-6">
            Smarter Trading Starts with{" "}
            <span className="text-blue-600">JournalX</span>
          </h1>
          <p className="text-lg mb-8 text-gray-600">
            Log your trades, analyze insights with AI, and grow your trading
            discipline.
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            Get Started Free
          </button>
        </section>

        {/* FEATURE SECTION */}
        <section className="grid md:grid-cols-3 gap-8 max-w-6xl px-6 py-16">
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Get instant trade reviews, sentiment analysis, and behavior
              tracking.
            </p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">
              Performance Dashboard
            </h3>
            <p className="text-gray-600">
              Visualize your trade metrics, win rates, and daily progress.
            </p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">Secure Cloud Sync</h3>
            <p className="text-gray-600">
              Access your trading data anywhere, safely and instantly.
            </p>
          </div>
        </section>

        {/* FEEDBACK / REVIEWS SECTION */}
        <section className="bg-white w-full py-20">
          <div className="max-w-5xl mx-auto text-center px-6">
            <h2 className="text-3xl font-bold mb-12">What Traders Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Amit (Swing Trader)",
                  text: "JournalX changed how I view my trades. The AI feedback is gold!",
                },
                {
                  name: "Priya (Options Trader)",
                  text: "Beautiful UI and simple analytics that actually make sense.",
                },
                {
                  name: "Rohit (Scalper)",
                  text: "This is the first journal that keeps me consistent every day.",
                },
              ].map((review, i) => (
                <div key={i} className="p-6 rounded-2xl shadow bg-gray-50">
                  <p className="text-gray-700 italic mb-4">“{review.text}”</p>
                  <h4 className="font-semibold text-gray-900">{review.name}</h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full bg-gray-900 text-gray-300 py-8 text-center text-sm">
          © {new Date().getFullYear()} JournalX ·
          <a href="/privacy-policy" className="ml-2 underline">
            Privacy
          </a>
          ·
          <a href="/terms-services" className="ml-2 underline">
            Terms
          </a>
        </footer>
      </main>
    </>
  );
}
