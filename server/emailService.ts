import nodemailer from 'nodemailer';

export async function sendEmailNotification(to: string, subject: string, text: string, html: string) {
  if (!to || !to.trim()) {
    console.log("No recipient defined. Skipping email dispatch gracefully.");
    return { success: true, messageId: 'skipped_blank_recipient', previewUrl: '' };
  }

  let transporter;
  let isUsingFallback = false;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;

  // Validate host for spacing or obvious malformations (e.g. "smtp ethereal.biplobnbc04@fmail.com")
  const isMalformedHost = !smtpHost || smtpHost.includes(' ') || smtpHost.includes('@');

  if (smtpHost && smtpUser && !isMalformedHost) {
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: smtpUser,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });
    } catch (e) {
      console.warn("Failed to initialize configured SMTP transporter. Falling back to Ethereal.", e);
      isUsingFallback = true;
    }
  } else {
    isUsingFallback = true;
  }

  if (isUsingFallback || !transporter) {
    console.log('Using Ethereal fallback account for mail delivery...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (e) {
      console.error("Failed to create Ethereal test account:", e);
      // In a dev/sandbox environment, let the operation succeed even if SMTP is failing completely
      return { success: false, error: 'Email service unavailable, order processing completed.' };
    }
  }

  try {
    const info = await transporter.sendMail({
      from: '"Street Threadx" <no-reply@streetthreadx.com>',
      to,
      subject,
      text,
      html,
    });

    console.log(`Message sent to ${to}: ${info.messageId}`);

    let previewUrl = '';
    if (isUsingFallback || !process.env.SMTP_HOST || isMalformedHost) {
      previewUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log("Preview URL: %s", previewUrl);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.warn("Failed to send email via primary SMTP. Trying once with Ethereal fallback...", error);
    
    if (!isUsingFallback) {
      try {
        console.log('Initiating emergency Ethereal fallback...');
        const testAccount = await nodemailer.createTestAccount();
        const fallbackTransporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        const info = await fallbackTransporter.sendMail({
          from: '"Street Threadx" <no-reply@streetthreadx.com>',
          to,
          subject,
          text,
          html,
        });
        console.log(`Emergency fallback message sent: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info) || '';
        console.log("Fallback Preview URL: %s", previewUrl);
        return { success: true, messageId: info.messageId, fallback: true, previewUrl };
      } catch (fallbackError) {
        console.error("Emergency Ethereal fallback failed too:", fallbackError);
      }
    }
    
    // Graceful recovery for AI Studio previews
    return { success: false, error: String(error) };
  }
}
