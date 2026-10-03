import nodemailer from "nodemailer";
export function createMailer(config) {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    ...(config.SMTP_USER
      ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS } }
      : {}),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return {
    async send(user, purpose, token) {
      const route =
        purpose === "verification" ? "verify-email" : "reset-password";
      if (config.NODE_ENV === "development" && purpose === "verification") {
        console.info(`[development] Verification code: ${token}`);
        console.info(
          `[development] Verify email: ${config.APP_URL}/${route}?token=${token}`,
        );
        return;
      }
      await transport.sendMail({
        from: config.EMAIL_FROM,
        to: user.email,
        subject:
          purpose === "verification"
            ? "Verify your SkillMart email"
            : "Reset your SkillMart password",
        text: `Open this link, then confirm the form:\n${config.APP_URL}/${route}?token=${token}\nIf you did not request this, ignore this email.`,
      });
    },
    close: () => transport.close(),
  };
}
