import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Neon Auth calls this for send.otp instead of sending its own email, so a failure here
// fails sign-in. Subscribed on the production branch with `neon neon-auth config webhook`.

const FROM = process.env.EMAIL_FROM ?? "Hatful <santa@thebadman.dev>";

type Jwk = crypto.JsonWebKey & { kid: string };
let jwks: Jwk[] | null = null;

async function findKey(kid: string) {
  const load = async () =>
    ((await (await fetch(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`)).json()) as { keys: Jwk[] }).keys;
  jwks ??= await load();
  let jwk = jwks.find((k) => k.kid === kid);
  // Refetch once in case Neon rotated keys since this instance cached them.
  if (!jwk) jwk = (jwks = await load()).find((k) => k.kid === kid);
  return jwk ? crypto.createPublicKey({ key: jwk, format: "jwk" }) : null;
}

// Detached JWS over `${timestamp}.${base64url(body)}`, per Neon's webhook docs.
async function verified(rawBody: string, headers: Headers) {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;

  const [headerB64, payload, signatureB64] = signature.split(".");
  if (payload !== "" || !headerB64 || !signatureB64) return false;
  const key = await findKey(kid);
  if (!key) return false;

  const bodyB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signedB64 = Buffer.from(`${timestamp}.${bodyB64}`, "utf8").toString("base64url");
  return crypto.verify(null, Buffer.from(`${headerB64}.${signedB64}`), key, Buffer.from(signatureB64, "base64url"));
}

// Traced into the function by outputFileTracingIncludes in next.config.ts.
type Attachment = { filename: string; content: string; content_id: string };
let templates: { html: string; text: string; images: Attachment[] } | null = null;
async function loadTemplates() {
  if (templates) return templates;
  const read = (name: string) => readFile(path.join(process.cwd(), "emails", name), "utf8");
  // Attached inline (cid:) so they show without the client fetching remote images.
  const image = async (id: string): Promise<Attachment> => ({
    filename: `${id}.png`,
    content_id: id,
    content: (await readFile(path.join(process.cwd(), "public", "email", `${id}.png`))).toString("base64"),
  });
  const [html, text, ...images] = await Promise.all([
    read("sign-in-code.html"),
    read("sign-in-code.txt"),
    image("hat"),
    image("tag-string"),
  ]);
  templates = {
    html: html.replace(/^<!--[\s\S]*?-->\s*/, ""),
    text: text.replace(/^##.*\n/gm, ""),
    images,
  };
  return templates;
}

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");

type OtpEvent = {
  event_id: string;
  event_type: string;
  timestamp: string;
  user: { email: string };
  event_data: { otp_code: string; expires_at: string };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verified(rawBody, request.headers))) return new Response(null, { status: 401 });

  const event = JSON.parse(rawBody) as OtpEvent;
  if (event.event_type !== "send.otp") return Response.json({ ignored: event.event_type });

  const code = event.event_data.otp_code.replace(/\D/g, "");
  const ms = Date.parse(event.event_data.expires_at) - Date.parse(event.timestamp);
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const values = { code, expires_in: minutes === 1 ? "1 minute" : `${minutes} minutes` };
  const { html, text, images } = await loadTemplates();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // Neon retries with the same event id; Resend then won't send twice.
      "Idempotency-Key": event.event_id,
    },
    body: JSON.stringify({
      from: FROM,
      to: event.user.email,
      subject: `Your Hatful code: ${code}`,
      html: fill(html, values),
      text: fill(text, values),
      attachments: images,
    }),
  });

  if (!res.ok) {
    console.error("neon-auth webhook: Resend refused the email", res.status, await res.text());
    return new Response(null, { status: 502 });
  }
  return Response.json({ sent: true });
}
