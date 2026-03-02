"use client";
import { useEffect, useRef } from "react";
import HeaderSection from "./HeaderSection";

export default function BentoGrid() {
  const videoRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, []);

  const cards = [
    {
      title: "Know What’s Right. Fix What’s Wrong.",
      desc: "Clearly see which trades made you money and which ones didn’t. Stop guessing. Start improving with real data.",
      highlight: "Clarity creates consistency.",
      video: "/assets/know_pattern.mp4",
      large: true,
    },
    {
      title: "Understand Your Trading Patterns",
      desc: "Identify which setups work, which don’t, and how your strategy performs over time.",
      video: "/assets/identify_pattern.mp4",
    },
    {
      title: "Make Better Future Decisions",
      desc: "Use historical insights to avoid repeat mistakes and improve every next trade.",
      video: "/assets/future_decision.mp4",
    },
    {
      title: "Track & Analyse Every Trade",
      desc: "Log entries, exits, screenshots, tags and performance metrics — all in one structured system.",
      video: "/assets/track_trades.mp4",
    },
    {
      title: "Control Your Trading Emotions",
      desc: "Spot emotional trades, overtrading patterns, and revenge setups before they hurt performance.",
      video: "/assets/emotions.mp4",
    },
    {
      title: "Build Long-Term Consistency",
      desc: "Track progress over weeks and months. Measure growth and build confidence backed by data.",
      video: "/assets/long_term.mp4",
    },
  ];

  return (
    <section className="bentoSection flexClm gap_32">
      <HeaderSection
        title="Why Every Serious Trader Journals"
        subtitle="Because consistency, clarity, and confidence don’t come from guessing — they come from reviewing."
      />

      <div className="bentoGrid">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`bentoCard ${card.large ? "bentoLarge" : ""}`}
          >
            <div className="bentoContent">
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              {card.highlight && (
                <span className="bentoHighlight">{card.highlight}</span>
              )}
            </div>

            <div className={`bentoImageWrap ${card.large ? "" : "small"}`}>
              <div className="videoWrapper">
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={card.video}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="bentoVideo"
                />
                <div className="videoFadeOverlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
