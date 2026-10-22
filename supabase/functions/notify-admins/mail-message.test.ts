import nodemailer from "npm:nodemailer@7.0.13";
import { simpleParser } from "npm:mailparser@3.12.2";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createNotificationMessage } from "./mail-message.ts";

Deno.test("SMTP message preserves accents, literal equals and long content after MIME decoding", async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const text = "Création — échéance à Bujumbura ❤️\nÉlément : The Freedom Incubator=20\n" + "Détails : épargne = 100000 BIF. ".repeat(100);
  const html = '<!DOCTYPE html><html lang="fr"><body><p>' + text + '</p><a href="https://famman.lovable.app/">SIGHT FAMILY</a></body></html>';
  const subject = "[SIGHT FAMILY] Création — application : " + "The Freedom Incubator épargne ".repeat(10);
  const result = await transport.sendMail(createNotificationMessage({
    senderEmail: "sender@example.org", recipientEmail: "admin@example.org", subject, text, html,
  }));
  const raw = result.message.toString();
  const parsed = await simpleParser(result.message);
  assert(raw.startsWith("From:"), "MIME must begin with a valid header, never a broken subject fragment");
  assert(raw.includes("Content-Type: multipart/alternative;"));
  assert(!raw.includes("multipart/mixed"));
  assertEquals(parsed.subject, subject);
  assertEquals(parsed.text?.replace(/\r\n/g, "\n").trimEnd(), text.trimEnd());
  assertEquals(typeof parsed.html === "string" ? parsed.html.replace(/\r\n/g, "\n").trimEnd() : parsed.html, html.trimEnd());
  assertEquals(parsed.from?.value[0]?.address, "sender@example.org");
  assertEquals(parsed.from?.value[0]?.name, "SIGHT FAMILY");
  transport.close();
});

Deno.test("SMTP subject cannot inject extra MIME headers", async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const result = await transport.sendMail(createNotificationMessage({
    senderEmail: "sender@example.org", recipientEmail: "admin@example.org",
    subject: "Création\r\nBcc: outsider@example.org", text: "Notification", html: "<p>Notification</p>",
  }));
  const parsed = await simpleParser(result.message);
  assertEquals(parsed.bcc, undefined);
  assertEquals(parsed.subject, "Création Bcc: outsider@example.org");
  transport.close();
});