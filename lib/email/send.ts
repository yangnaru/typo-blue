import { MailgunTransport } from "@upyo/mailgun";
import { createMessage } from "@upyo/core";

// Sends one email through Mailgun; returns whether it was accepted
export async function sendMail({
  to,
  subject,
  text,
  html,
  headers,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  const transport = new MailgunTransport({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  });

  const message = createMessage({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    content: html ? { text, html } : { text },
    headers,
  });

  const receipt = await transport.send(message);
  if (!receipt.successful) {
    console.error("Send failed:", receipt.errorMessages.join(", "));
    return false;
  }
  console.log("Message sent with ID:", receipt.messageId);
  return true;
}
