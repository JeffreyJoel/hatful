import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createRequire } from "node:module";
import { smtpTimeouts } from "./smtp.ts";

const nodemailer = createRequire(import.meta.url)("nodemailer");

test("a server that accepts and then says nothing fails the send within the timeout", { timeout: 15_000 }, async () => {
  const sockets: net.Socket[] = [];
  const server = net.createServer((s) => sockets.push(s)).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as net.AddressInfo;
  const transport = nodemailer.createTransport({ host: "127.0.0.1", port, secure: false, ...smtpTimeouts });
  const started = Date.now();
  try {
    await assert.rejects(transport.sendMail({ from: "a@test.local", to: "b@test.local", subject: "s", text: "t" }));
    assert.ok(Date.now() - started < 10_000, "gave up well inside a function's time limit");
  } finally {
    sockets.forEach((s) => s.destroy());
    server.close();
  }
});
