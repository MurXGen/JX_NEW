/* Shared JournalX email layout. Every JournalX email (verification code,
   onboarding, receipts, service notices) is built from these pieces so they
   all look the same: white page, a CSS-only JournalX logo, plain text, thin
   border lines as the only separators, one gold button.

   Email clients don't run JavaScript, so nothing here can copy to the
   clipboard. The code block is styled so one tap selects the whole code, and
   Gmail / Apple Mail add their own "Copy code" button for codes they detect. */

const isLocal = (u) => !u || /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
const APP_URL =
  [process.env.APP_PUBLIC_URL, process.env.CLIENT_URL].find((u) => u && !isLocal(u))?.replace(/\/+$/, "") ||
  "https://journalx.app";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const C = {
  ink: "#111318",
  body: "#3b414b",
  muted: "#6b7280",
  faint: "#9aa1ab",
  line: "#e6e8eb",
  gold: "#f0b90b",
  green: "#12895c",
  page: "#ffffff",
};

const esc = (s) =>
  String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* CSS-only logo: the JournalX wordmark with a gold X. */
const logo = () => `
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.4px;color:${C.ink};">Journal<span style="color:${C.gold};">X</span></td>
  </tr>
</table>`;

const p = (html, { muted = false, size = 15, top = 0, bottom = 14 } = {}) =>
  `<p style="margin:${top}px 0 ${bottom}px;font-family:${FONT};font-size:${size}px;line-height:1.6;color:${muted ? C.muted : C.body};">${html}</p>`;

const divider = (space = 24) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:${space}px 0 0;border-bottom:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="padding:${space}px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

const label = (t) =>
  `<div style="margin:0 0 10px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.faint};">${t}</div>`;

const button = (text, url) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
  <tr><td style="border-radius:10px;background:${C.gold};">
    <a href="${url}" target="_blank"
       style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14.5px;font-weight:600;color:${C.ink};text-decoration:none;border-radius:10px;">${text} &rarr;</a>
  </td></tr>
</table>`;

/* Verification code: bordered box, monospace digits, one tap selects all. */
const codeBlock = (code) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;border:1px solid ${C.line};border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;">
      <div style="font-family:${MONO};font-size:30px;font-weight:700;letter-spacing:8px;color:${C.ink};-webkit-user-select:all;user-select:all;">${esc(code)}</div>
    </td>
    <td align="right" valign="middle" style="padding:18px 20px;white-space:nowrap;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="padding-right:8px;">
          <!-- CSS copy icon: two overlapping squares -->
          <div style="position:relative;width:14px;height:14px;">
            <div style="position:absolute;left:4px;top:0;width:9px;height:9px;border:1.5px solid ${C.muted};border-radius:2px;"></div>
            <div style="position:absolute;left:0;top:4px;width:9px;height:9px;border:1.5px solid ${C.muted};border-radius:2px;background:${C.page};"></div>
          </div>
        </td>
        <td valign="middle" style="font-family:${FONT};font-size:12px;color:${C.muted};">Select to copy</td>
      </tr></table>
    </td>
  </tr>
</table>`;

/* Full email. `body` is HTML built from the helpers above. */
function layout({ preheader = "", heading, body = "", cta, footer = "", title = "JournalX" }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/>
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
    <tr><td align="center" style="padding:36px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
        <tr><td style="padding-bottom:28px;border-bottom:1px solid ${C.line};">${logo()}</td></tr>
        <tr><td style="padding-top:28px;">
          <h1 style="margin:0 0 14px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;color:${C.ink};">${heading}</h1>
          ${body}
          ${cta ? button(cta.text, cta.url) : ""}
        </td></tr>
        <tr><td style="padding-top:28px;">
          <div style="border-top:1px solid ${C.line};padding-top:20px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">
            ${footer ? `${footer}<br/>` : ""}
            <a href="${APP_URL}" target="_blank" style="color:${C.muted};text-decoration:underline;">journalx.app</a>
            &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/contact" target="_blank" style="color:${C.muted};text-decoration:underline;">Contact support</a>
            <br/>The JournalX Team
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* Plain-text version that follows the same order. */
const plainText = (lines) => [...lines.filter(Boolean), "The JournalX Team"].join("\n\n");

/* Generic notice (maintenance, outages, product updates). */
function buildNoticeEmail({ subject, heading, paragraphs = [], cta, footer }) {
  const html = layout({
    preheader: paragraphs[0] || heading,
    heading: esc(heading),
    body: paragraphs.map((t) => p(t)).join(""),
    cta,
    footer: footer || "You're receiving this service update because you have a JournalX account.",
  });
  const text = plainText([heading, ...paragraphs.map((t) => t.replace(/<[^>]+>/g, "")), cta && `${cta.text}: ${cta.url}`]);
  return { subject, html, text };
}

module.exports = { APP_URL, FONT, C, esc, logo, p, divider, label, button, codeBlock, layout, plainText, buildNoticeEmail };
