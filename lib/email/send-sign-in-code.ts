import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { renderSignInCode } from "./render-sign-in-code";
import { smtpTimeouts } from "./smtp";

// Traced into every function by outputFileTracingIncludes in next.config.ts.
type Assets = { html: string; text: string; images: { filename: string; content: Buffer; cid: string }[] };
let assets: Promise<Assets> | null = null;
function loadAssets() {
  const read = (name: string) => readFile(path.join(process.cwd(), "emails", name), "utf8");
  // Attached inline (cid:) so they show without the client fetching remote images.
  const image = async (id: string) => ({
    filename: `${id}.png`,
    cid: id,
    content: await readFile(path.join(process.cwd(), "public", "email", `${id}.png`)),
  });
  assets ??= Promise.all([read("sign-in-code.html"), read("sign-in-code.txt"), image("hat"), image("tag-string")])
    .then(([html, text, ...images]) => ({ html, text, images }))
    .catch((error) => {
      assets = null;
      throw error;
    });
  return assets;
}

// Built on first send so a build without RESEND_API_KEY still imports this module.
let transport: Transporter | null = null;
const getTransport = () =>
  (transport ??= nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    ...smtpTimeouts,
  }));

// Throws if SMTP refuses, so the caller can tell the person the code was not sent.
export async function sendSignInCode(to: string, code: string, expiresInSeconds: number): Promise<void> {
  const { html, text, images } = await loadAssets();
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM ?? "Hatful <santa@thebadman.dev>",
    to,
    ...renderSignInCode({ code, expiresInSeconds, html, text }),
    attachments: images,
  });
}
