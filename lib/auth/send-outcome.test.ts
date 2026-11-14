import { test } from "node:test";
import assert from "node:assert/strict";
import { noteSendFailure, withSendOutcome } from "./send-outcome.ts";

// Stands in for Better Auth, which awaits the send but swallows its error.
const swallowing = async (send: () => Promise<void>) => {
  try {
    await noteSendFailure(send);
  } catch {}
  return "ok";
};

test("a send the library swallowed is still reported", async () => {
  const boom = new Error("535 Authentication credentials invalid");
  const out = await withSendOutcome(() => swallowing(() => Promise.reject(boom)));
  assert.equal(out.result, "ok");
  assert.equal(out.sendError, boom);
});
test("a send that worked reports nothing", async () => {
  const out = await withSendOutcome(() => swallowing(async () => {}));
  assert.equal(out.sendError, undefined);
});
test("the failure still reaches the library", async () => {
  await assert.rejects(noteSendFailure(() => Promise.reject(new Error("x"))), /x/);
});
test("concurrent requests keep their own outcome", async () => {
  const [bad, good] = await Promise.all([
    withSendOutcome(() => swallowing(() => Promise.reject(new Error("bad")))),
    withSendOutcome(() => swallowing(async () => {})),
  ]);
  assert.ok(bad.sendError);
  assert.equal(good.sendError, undefined);
});
