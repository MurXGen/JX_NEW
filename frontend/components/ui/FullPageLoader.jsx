import Image from "next/image";
import React, { useEffect, useState } from "react";

const FullPageLoader = () => {
  const icons = ["/assets/jx_trans_favicon.png"];

  const quotes = [
    "Discipline turns losses into lessons and lessons into profit.",
    "Consistency beats intensity when mastering profitable trading habits daily.",
    "Emotions destroy profits faster than bad trades ever will.",
    "Plan your trades, trade your plan with calm focus.",
    "Patience creates opportunities where others rush and lose money.",
    "Every loss teaches precision, every gain teaches patience again.",
    "Trade less, think more, and manage your risks first.",
    "Profitability grows when ego shrinks and patience takes control.",
    "Focus on process, not profit, results will naturally follow.",
    "Master risk management and profits will follow automatically forever after.",
  ];

  const [randomIcon, setRandomIcon] = useState("");
  const [randomQuote, setRandomQuote] = useState("");

  useEffect(() => {
    setRandomIcon(icons[Math.floor(Math.random() * icons.length)]);
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return (
    <div className="fullpageLoader">
      <div className="loaderContent">
        <Image
          width={50}
          height={50}
          src={randomIcon}
          alt="Loader Icon"
          className="blinkingIcon"
        />
        <p className="traderQuote">{randomQuote}</p>
      </div>
    </div>
  );
};

export default FullPageLoader;
