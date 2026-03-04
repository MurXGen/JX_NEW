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
      title: "Turn Random Trades into Clear Lessons",
      desc: "Stop relying on memory and emotion. See exactly what worked, what failed, and why — so every trade becomes a lesson instead of a guess.",
      highlight: "Awareness drives improvement.",
      video: "/assets/know_pattern1.mp4",
      large: true,
    },
    {
      title: "Expose Your Hidden Patterns",
      desc: "See what you keep repeating",
      video: "/assets/identify_pattern1.mp4",
    },
    {
      title: "Upgrade Your Next Decision",
      desc: "Turn past data into action",
      video: "/assets/future_decision1.mp4",
    },
    {
      title: "Create a System, Not Chaos",
      desc: "One workflow for every trade",
      video: "/assets/track_trades1.mp4",
    },
    {
      title: "Control emotions with data",
      desc: "Trade logic, not feelings",
      video: "/assets/emotions1.mp4",
    },
    {
      title: "Build Confidence Over Time",
      desc: "Progress backed by real data",
      video: "/assets/long_term1.mp4",
    },
  ];

  return (
    <section
      className="bentoSection flexClm gap_32"
      aria-label="Why journaling improves trading performance"
    >
      <HeaderSection
        title="Why Serious Traders Review Every Trade"
        subtitle="A trading journal helps improve performance, discipline, and trading consistency."
      />

      <div className="bentoGrid">
        {cards.map((card, index) => (
          <article
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
          </article>
        ))}
      </div>
    </section>
  );
}
