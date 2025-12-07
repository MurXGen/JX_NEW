// pages/settings.jsx
import { useEffect } from "react";
import Head from "next/head";
import {
  ArrowLeft,
  BookIcon,
  ChevronRight,
  Share,
  Share2Icon,
  User,
  User2Icon,
} from "lucide-react";
import { Book, Share2, User2 } from "lucide";

export default function Settings() {
  return (
    <>
      <Head>
        <title>Settings | JournalX</title>
        <meta
          name="description"
          content="Manage your JournalX account settings and preferences."
        />
      </Head>
      <div className="flexClm gap_24">
        {/* <div className="flexRow gap_8">
          <button className="button_sec flexRow">
            <ArrowLeft size={20} />
          </button>
          <span className="font_16">Setting</span>
        </div> */}
        <div
          className="boxBg flexRow flexRow_stretch profileCard"
          style={{ background: "var(--white-10)" }}
        >
          <div className="flexRow gap_12">
            <div className="font_12">
              <User2Icon />
            </div>
            <div className="flexClm">
              <span className="font_14 font_weight_500">Murthy thevar</span>
              <span className="font_12 shade_50">
                murthyofficial3@gmail.com
              </span>
            </div>
          </div>
          <div className="font_8">
            <ChevronRight size={20} className="vector" />
          </div>
        </div>
        <div
          className="upgradeCard"
          style={{
            background: "linear-gradient(135deg, #fff,var(--primary) )", // yellowish
            padding: "var(--px-16)",
            borderRadius: "12px",
            color: "#000",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "relative",
            boxShadow: "1px 1px 24px var(--primary-20)",
          }}
        >
          {/* Snow effect (simple floating dots) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(white 1px, transparent 1px), radial-gradient(white 2px, transparent 2px)",
              backgroundSize: "20px 20px, 35px 35px",
              backgroundPosition: "0 0, 10px 10px",
              opacity: 0.25,
              animation: "snowFloat 6s linear infinite",
            }}
          />

          <span style={{ fontSize: "16px", fontWeight: 600, zIndex: 2 }}>
            🎄 Get up to 50% off this Christmas
          </span>

          <button
            onClick={() => (window.location.href = "/pricing")}
            className="button_ter"
            style={{ minWidth: "120px", maxWidth: "fit-content" }}
          >
            View Pricing
          </button>

          {/* Snow keyframes (inject dynamically) */}
          <style>
            {`
      @keyframes snowFloat {
        from { background-position: 0 0, 10px 10px; }
        to { background-position: 0 100px, 10px 110px; }
      }
    `}
          </style>
        </div>
        <div className="moreServices flexClm gap_12">
          <span className="font_14 shade_50">Shortcuts</span>
          <div className="gridContainer gap_24">
            <div className="flexClm gap_8" style={{}}>
              <BookIcon className="vector boxBg" size={20} />
              <span className="font_12">Journals</span>
            </div>
            <div className="flexClm gap_8" style={{}}>
              <Share className="vector boxBg" size={20} />
              <span className="font_12">Export</span>
            </div>
            <div className="flexClm gap_8" style={{}}>
              <Share2Icon size={20} className="vector boxBg" />
              <span className="font_12">Share</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
