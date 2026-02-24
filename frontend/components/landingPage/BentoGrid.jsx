export default function BentoGrid() {
  return (
    <section className="bentoSection">
      <div className="bentoHeader">
        <h2 className="bentoTitle">
          Everything you need to trade smarter. Nothing you don’t.
        </h2>
      </div>

      <div className="bentoGrid">
        {/* 1️⃣ Large Hero Card */}
        <div className="bentoCard bentoLarge">
          <div className="bentoContent">
            <h3>Quick Log in Seconds</h3>
            <p>
              Log trades in under 10 seconds. Just symbol + P&amp;L. Add
              screenshots, tags, learnings if you want.
            </p>
            <span className="bentoHighlight">No friction. No excuses.</span>
          </div>

          <div className="bentoImageWrap">
            <img src="/assets/easy_smooth.svg" alt="Quick log preview" />
          </div>
        </div>

        {/* 2 */}
        <div className="bentoCard">
          <div className="bentoContent">
            <h3>Powerful Dashboard Analytics</h3>
            <p>
              Candlestick P&amp;L charts, win-rate, expectancy, tag insights,
              long/short breakdown — all in one place.
            </p>
          </div>

          <div className="bentoImageWrap small">
            <img src="/assets/easy_smooth.svg" alt="Dashboard analytics" />
          </div>
        </div>

        {/* 3 */}
        <div className="bentoCard">
          <div className="bentoContent">
            <h3>Trade Cards with Snapshots</h3>
            <p>
              Scroll through trades visually. Compare screenshots and see
              exactly where things went wrong.
            </p>
          </div>

          <div className="bentoImageWrap small">
            <img src="/assets/easy_smooth.svg" alt="Trade cards preview" />
          </div>
        </div>

        {/* 4 */}
        <div className="bentoCard">
          <div className="bentoContent">
            <h3>Smart Tag & Pattern Analysis</h3>
            <p>
              Discover winning setups, identify emotional trades, and eliminate
              repeat mistakes.
            </p>
          </div>

          <div className="bentoImageWrap small">
            <img src="/assets/easy_smooth.svg" alt="Tag analysis preview" />
          </div>
        </div>

        {/* 5 */}
        <div className="bentoCard">
          <div className="bentoContent">
            <h3>Calendar Performance View</h3>
            <p>
              Monthly & yearly heatmaps. Green days. Red days. Instant clarity
              on consistency.
            </p>
          </div>

          <div className="bentoImageWrap small">
            <img src="/assets/easy_smooth.svg" alt="Calendar preview" />
          </div>
        </div>

        {/* 6 */}
        <div className="bentoCard">
          <div className="bentoContent">
            <h3>Running & Closed Trade Tracking</h3>
            <p>
              Auto P&amp;L calculations. Track active trades and know your real
              exposure anytime.
            </p>
          </div>

          <div className="bentoImageWrap small">
            <img src="/assets/easy_smooth.svg" alt="Trade tracking preview" />
          </div>
        </div>
      </div>
    </section>
  );
}
