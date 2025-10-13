const { resend } = require("./resendClient");

async function sendOtpEmail({ to, otp, name }) {
  const from = `JournalX <${process.env.EMAIL_FROM}>`;

  const html = `
    <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 16px; color: #111; line-height: 1.6;">
      <p>Hi ${name || ""},</p>

      <p>Welcome to <strong>JournalX</strong> — your personal trading companion where discipline meets strategy!</p>

      <p>Log your trades, track your progress, and get <strong>AI-powered insights</strong> to sharpen your decisions.</p>

      <p>Exciting journeys start with small steps. Your verification code is:</p>

      <h2 style="letter-spacing: 4px; color: #2E8B57;">${otp}</h2>

      <p style="margin-top: 8px;">This code will expire in <strong>5 minutes</strong>. Enter it to unlock your trading journey!</p>

      <p style="margin-top: 16px; font-style: italic; color: #555;">— The JournalX Team</p>
    </div>
  `;

  const text = `Hi ${name || ""},

Welcome to JournalX — your personal trading companion where discipline meets strategy!
Log your trades, track your progress, and get AI-powered insights to sharpen your decisions.

Your verification code is: ${otp}
It will expire in 5 minutes.

— The JournalX Team
`;

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject: "Code arrived from JournalX!",
      text,
      html,
    });
    console.log("✅ Email sent successfully:", response);
    return response;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err;
  }
}

module.exports = { sendOtpEmail };
