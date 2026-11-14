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
