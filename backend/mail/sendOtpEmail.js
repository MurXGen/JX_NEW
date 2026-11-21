const { resend } = require("./resendClient");
const { layout, p, codeBlock, plainText, esc } = require("./layout");

/* Verification code email. The code is in the subject so Gmail and Apple Mail
   can offer their built-in "Copy code" button. */
function buildOtpEmail({ otp, name }) {
  const first = esc((name || "").trim().split(" ")[0]);
  const subject = `${otp} is your JournalX verification code`;
  const html = layout({
    title: "Your JournalX code",
    preheader: `Your verification code is ${otp}. It expires in 5 minutes.`,
    heading: "Your verification code",
    body: [
      p(`${first ? `Hi ${first}, use` : "Use"} this code to continue on JournalX.`),
      codeBlock(otp),
      p("The code expires in <strong style=\"color:#111318;\">5 minutes</strong>.", { muted: true, size: 13.5, bottom: 4 }),
      p("If you didn't request it, you can ignore this email. Your account stays safe without it.", { muted: true, size: 13.5, bottom: 0 }),
    ].join(""),
    footer: "Sent because someone entered this email address on JournalX.",
  });
  const text = plainText([
    first ? `Hi ${first},` : null,
    "Use this code to continue on JournalX:",
    String(otp),
    "The code expires in 5 minutes. If you didn't request it, you can ignore this email.",
  ]);
  return { subject, html, text };
}

async function sendOtpEmail({ to, otp, name }) {
  const from = `JournalX <${process.env.EMAIL_FROM}>`;
  const { subject, html, text } = buildOtpEmail({ otp, name });
  return resend.emails.send({ from, to, subject, text, html });
}

module.exports = { sendOtpEmail, buildOtpEmail };
