"use client";

import LegalLayout from "@/components/legal/LegalLayout";

export default function RiskDisclaimer() {
  return (
    <LegalLayout
      title="Risk Disclaimer"
      path="/risk-disclaimer"
      updated="June 8, 2026"
      description="Important risk disclaimer for JournalX. Trading involves substantial risk of loss. JournalX is a journaling and analytics tool, not financial advice."
      intro="Please read this Risk Disclaimer carefully. It applies to your use of JournalX and all information, analytics, and projections provided by the Service."
      sections={[
        {
          h: "1. Trading Involves Risk",
          body: [
            "Trading and investing in financial instruments — including stocks, options, futures, forex, and cryptocurrencies — carries a substantial risk of loss and is not suitable for every investor. You may lose some or all of your invested capital. You should not trade with money you cannot afford to lose. Leverage can magnify both gains and losses.",
          ],
        },
        {
          h: "2. Not Financial Advice",
          body: [
            "JournalX is a trade-journaling and analytics tool. The Service, including all metrics, statistics, charts, projections, forecasts, and “if you had held” estimates, is provided for informational and educational purposes only. Nothing in the Service constitutes financial, investment, tax, accounting, or legal advice, nor a recommendation or solicitation to buy, sell, or hold any instrument.",
          ],
        },
        {
          h: "3. No Guarantee of Results",
          body: [
            "Past performance is not indicative of future results. Any analytics derived from your historical trades describe what has already happened and do not predict or guarantee future outcomes. Forward-looking estimates are hypothetical, may rely on third-party data that can be delayed or inaccurate, and should never be relied upon as a basis for any trading decision.",
          ],
        },
        {
          h: "4. Your Responsibility",
          body: [
            "All trading decisions you make are your sole responsibility. You should conduct your own research and, where appropriate, consult a licensed financial professional before making any investment decision. JournalX is not a broker, dealer, investment adviser, or fiduciary, and does not execute trades on your behalf.",
          ],
        },
        {
          h: "5. Third-Party Data",
          body: [
            "The Service may display market data and prices sourced from third parties. We do not guarantee the accuracy, completeness, or timeliness of such data and accept no liability for any loss arising from reliance on it.",
          ],
        },
        {
          h: "6. Limitation of Liability",
          body: [
            "To the fullest extent permitted by law, JournalX accepts no liability for any trading or investment losses, lost profits, or other damages arising from your use of the Service or reliance on any information it provides. Your use of the Service is entirely at your own risk.",
          ],
        },
      ]}
    />
  );
}
