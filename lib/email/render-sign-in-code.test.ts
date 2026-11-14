import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSignInCode } from "./render-sign-in-code.ts";

const html = "<!-- note -->\n<p>{{code}} {{expires_in}}</p>";
const text = "## note\n{{code}} {{expires_in}}\n";

test("fills code and expiry, strips template notes", () => {
  const out = renderSignInCode({ code: "482917", expiresInSeconds: 300, html, text });
  assert.equal(out.subject, "Your Hatful code: 482917");
  assert.equal(out.html, "<p>482917 5 minutes</p>");
  assert.equal(out.text, "482917 5 minutes\n");
});
test("one minute is singular", () => {
  assert.match(renderSignInCode({ code: "1", expiresInSeconds: 60, html, text }).text, /1 minute\n/);
});
test("non-digits never reach the email", () => {
  assert.equal(renderSignInCode({ code: "12<b>34", expiresInSeconds: 300, html, text }).subject, "Your Hatful code: 1234");
});

test("the real template loads its images from the live site, not attachments", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../../emails/sign-in-code.html", import.meta.url), "utf8");
  const out = renderSignInCode({ code: "1", expiresInSeconds: 300, html, text: "" }).html;
  assert.doesNotMatch(out, /cid:/);
  const srcs = [...out.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(srcs.length > 0);
  for (const src of srcs) assert.match(src, /^https:\/\/hatful-handover\.vercel\.app\/email\/[\w-]+\.png$/);
});
