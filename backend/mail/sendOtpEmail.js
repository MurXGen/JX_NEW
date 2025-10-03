const { resend } = require("./resendClient");

async function sendOtpEmail({ to, otp, name }) {
  const from = `Your App <${process.env.EMAIL_FROM}>`;

  const html = `
    <div style="font-family: Arial; font-size: 16px;">
      <p>Hi ${name || ""},</p>
      <p>Your verification code is:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>— Your App Team</p>
    </div>
  `;

  const text = `Hi ${name || ""},\n\nYour verification code is: ${otp}\nIt will expire in 10 minutes.`;

  try {
    console.log(`🚀 Sending OTP email to: ${to}`);
    const response = await resend.emails.send({
      from,
      to,
      subject: "Your verification code",
      text,
      html,
    });
    console.log("✅ Email sent successfully:", response);
    return response;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err; // rethrow so your registration flow can handle it
  }
}

module.exports = { sendOtpEmail };
