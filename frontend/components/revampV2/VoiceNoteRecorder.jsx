"use client";

/* VoiceNoteRecorder, record a short voice note on a trade.
   • Captures audio with MediaRecorder (webm/opus where supported).
   • Live speech-to-text via the browser Web Speech API (Chrome/Android are
     great; Safari/iOS may not transcribe, audio still records fine).
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

export default function VoiceNoteRecorder({ onChange, existingUrl = "", dashed = false }) {
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

      // live transcription (best-effort, not on every browser)
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

  // dashed trigger used for the idle state, matches the "Add image" dropzone
  const dashedBtn = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", padding: "12px", borderRadius: "var(--radius-md)",
    border: "1.5px dashed var(--color-border-strong)", background: "transparent",
    color: "var(--color-text-secondary)", font: "var(--text-body-md)", fontWeight: 600,
    cursor: "pointer",
  };
  const box = {
    border: dashed ? "1.5px dashed var(--color-border-strong)" : "1px solid var(--color-border)",
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

  // idle → a single dashed button (so it can sit in a row next to "Add image")
  if (phase === "idle") {
    return (
      <button type="button" onClick={startRecording} style={dashedBtn}>
        <Mic size={16} /> Record voice note
      </button>
    );
  }

  // decorative bars, animate while recording / playing, static otherwise
  const BAR_COUNT = 28;
  const bars = Array.from({ length: BAR_COUNT });

  return (
    <div style={box}>
      {phase === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className="jx-rec-dot" />
          <span style={{ font: "var(--text-body-md)", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--color-danger)", flexShrink: 0 }}>
            {fmtTime(seconds)}
          </span>
          {/* live equalizer */}
          <div className="jx-eq" aria-hidden="true">
            {bars.map((_, i) => (
              <span key={i} className="jx-eq__bar" style={{ animationDelay: `${(i % 7) * 90}ms` }} />
            ))}
          </div>
          <button type="button" className="jx-btn jx-btn--primary jx-btn--sm" onClick={stopRecording}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Square size={14} /> Stop
          </button>
        </div>
      )}

      {phase === "recorded" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
            style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--color-primary)", color: "var(--color-primary-foreground)",
              boxShadow: "0 4px 14px rgba(240,185,11,0.4)",
            }}>
            {playing ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>
          {/* waveform (animates while playing) */}
          <div className={`jx-wave ${playing ? "jx-wave--playing" : ""}`} aria-hidden="true">
            {bars.map((_, i) => (
              <span key={i} className="jx-wave__bar" style={{ height: `${28 + Math.abs(Math.sin(i * 1.3)) * 60}%`, animationDelay: `${(i % 7) * 90}ms` }} />
            ))}
          </div>
          <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {seconds ? fmtTime(seconds) : "Voice note"}
          </span>
          <button type="button" onClick={reset} aria-label="Delete voice note"
            className="jx-btn jx-btn--ghost jx-btn--sm" style={{ color: "var(--color-danger)", padding: 6, flexShrink: 0 }}>
            <Trash2 size={16} />
          </button>
          {audioUrl && (
            <audio ref={audioElRef} src={audioUrl} onEnded={() => setPlaying(false)} style={{ display: "none" }} />
          )}
        </div>
      )}

      {/* live / final transcript */}
      {(transcript || interim) && (
        <div style={{
          font: "var(--text-caption)", color: "var(--color-text-secondary)", lineHeight: 1.55,
          whiteSpace: "pre-wrap", borderLeft: "2px solid var(--color-primary)", paddingLeft: 10,
        }}>
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
        .jx-rec-dot {
          width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0;
          background: var(--color-danger);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 60%, transparent);
          animation: jx-rec-pulse 1.4s ease-out infinite;
        }
        @keyframes jx-rec-pulse {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 55%, transparent); }
          70% { box-shadow: 0 0 0 9px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        /* live equalizer while recording */
        .jx-eq { display: flex; align-items: center; gap: 3px; height: 30px; flex: 1; min-width: 0; overflow: hidden; }
        .jx-eq__bar {
          flex: 1; min-width: 2px; max-width: 4px; border-radius: 2px;
          background: var(--color-danger);
          height: 30%;
          animation: jx-eq 0.7s ease-in-out infinite alternate;
        }
        @keyframes jx-eq { from { height: 18%; opacity: 0.5; } to { height: 100%; opacity: 1; } }
        /* recorded waveform */
        .jx-wave { display: flex; align-items: center; gap: 3px; height: 32px; flex: 1; min-width: 0; overflow: hidden; }
        .jx-wave__bar {
          flex: 1; min-width: 2px; max-width: 4px; border-radius: 2px;
          background: var(--color-border-strong);
        }
        .jx-wave--playing .jx-wave__bar {
          background: var(--color-primary);
          animation: jx-eq 0.6s ease-in-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .jx-rec-dot, .jx-eq__bar, .jx-wave--playing .jx-wave__bar { animation: none; }
        }
      `}</style>
    </div>
  );
}
