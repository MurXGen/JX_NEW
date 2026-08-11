"use client";

/* VoiceNoteRecorder — record a short voice note on a trade.
   • Captures audio with MediaRecorder (webm/opus where supported).
   • Live speech-to-text via the browser Web Speech API (Chrome/Android are
     great; Safari/iOS may not transcribe — audio still records fine).
   • Emits { blob, transcript, durationSec } to the parent via onChange so the
     log modals can attach the file + append the transcript to notes.
   • Also supports an existing saved note (existingUrl) for playback on edit. */

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${ss}`;
};

export default function VoiceNoteRecorder({ onChange, existingUrl = "", compact = false }) {
  const [phase, setPhase] = useState(existingUrl ? "recorded" : "idle"); // idle | recording | recorded
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [audioUrl, setAudioUrl] = useState(existingUrl || "");
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const mediaRef = useRef(null);      // MediaRecorder
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recogRef = useRef(null);      // SpeechRecognition
  const timerRef = useRef(null);
  const audioElRef = useRef(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof window !== "undefined" && !!window.MediaRecorder);
  }, []);

  // clean up on unmount
  useEffect(() => () => {
    try { timerRef.current && clearInterval(timerRef.current); } catch {}
    try { recogRef.current && recogRef.current.stop(); } catch {}
    try { streamRef.current && streamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
  }, []);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      finalRef.current = "";
      setTranscript("");
      setInterim("");
      setSeconds(0);

      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setPhase("recorded");
        const finalTranscript = (finalRef.current || "").trim();
        setTranscript(finalTranscript);
        onChange?.({ blob, transcript: finalTranscript, durationSec: seconds });
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      };
      mr.start();

      // live transcription (best-effort — not on every browser)
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (e) => {
          let interimTxt = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const chunk = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalRef.current += chunk + " ";
            else interimTxt += chunk;
          }
          setInterim(interimTxt);
          setTranscript(finalRef.current.trim());
        };
        rec.onerror = () => {};
        recogRef.current = rec;
        try { rec.start(); } catch {}
      }

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    } catch (e) {
      setError("Microphone permission is needed to record a voice note.");
    }
  };

  const stopRecording = () => {
    try { clearInterval(timerRef.current); } catch {}
    try { recogRef.current?.stop(); } catch {}
    try { mediaRef.current?.stop(); } catch {}
  };

  const reset = () => {
    setPhase("idle");
    setSeconds(0);
    setTranscript("");
    setInterim("");
    setPlaying(false);
    if (audioUrl && audioUrl.startsWith("blob:")) { try { URL.revokeObjectURL(audioUrl); } catch {} }
    setAudioUrl("");
    onChange?.({ blob: null, transcript: "", durationSec: 0, cleared: true });
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const box = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-surface)",
    padding: "var(--space-3)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  };

  if (!supported) {
    return (
      <div style={{ ...box, color: "var(--color-text-muted)", font: "var(--text-caption)" }}>
        Voice notes aren’t supported in this browser. Try Chrome.
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {phase === "idle" && (
          <button type="button" className="jx-btn jx-btn--secondary jx-btn--sm" onClick={startRecording}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Mic size={15} /> Record voice note
          </button>
        )}

        {phase === "recording" && (
          <>
            <span style={{ display: "inline-flex", width: 9, height: 9, borderRadius: "50%", background: "var(--color-danger)", animation: "jx-rec-pulse 1.1s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ font: "var(--text-body-md)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtTime(seconds)}</span>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Recording…</span>
            <button type="button" className="jx-btn jx-btn--primary jx-btn--sm" onClick={stopRecording}
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Square size={14} /> Stop
            </button>
          </>
        )}

        {phase === "recorded" && (
          <>
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
              className="jx-btn jx-btn--secondary jx-btn--sm" style={{ padding: 8, borderRadius: "50%" }}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
              <Mic size={12} style={{ verticalAlign: "-2px" }} /> Voice note{seconds ? ` · ${fmtTime(seconds)}` : ""}
            </span>
            <button type="button" onClick={reset} aria-label="Delete voice note"
              className="jx-btn jx-btn--ghost jx-btn--sm" style={{ marginLeft: "auto", color: "var(--color-danger)" }}>
              <Trash2 size={15} />
            </button>
            {audioUrl && (
              <audio ref={audioElRef} src={audioUrl} onEnded={() => setPlaying(false)} style={{ display: "none" }} />
            )}
          </>
        )}
      </div>

      {/* live / final transcript */}
      {(transcript || interim) && (
        <div style={{ font: "var(--text-caption)", color: "var(--color-text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {transcript} <span style={{ color: "var(--color-text-muted)" }}>{interim}</span>
        </div>
      )}

      {phase === "recording" && !transcript && !interim && (
        <div style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Loader2 size={12} className="jx-spin" /> Listening… speak your thesis or lesson.
        </div>
      )}

      {error && <div style={{ font: "var(--text-caption)", color: "var(--color-danger)" }}>{error}</div>}

      <style jsx>{`
        @keyframes jx-rec-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
