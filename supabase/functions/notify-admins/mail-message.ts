// Keep MIME generation in Nodemailer; never pre-encode text or headers.
export function createNotificationMessage(input: {
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
}) {
  return {
    from: { name: "SIGHT FAMILY", address: input.senderEmail },
    to: { address: input.recipientEmail, name: "" },
    subject: input.subject.replace(/[\r\n]+/g, " "),
    text: input.text,
    html: input.html,
    textEncoding: "base64" as const,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}