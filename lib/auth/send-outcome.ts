import { AsyncLocalStorage } from "node:async_hooks";

// Better Auth awaits sendVerificationOTP but swallows its error and answers
// success. This carries the failure back to the caller of the same request.
const outcome = new AsyncLocalStorage<{ sendError?: unknown }>();

export async function withSendOutcome<T>(run: () => Promise<T>): Promise<{ result: T; sendError?: unknown }> {
  const store: { sendError?: unknown } = {};
  const result = await outcome.run(store, run);
  return { result, sendError: store.sendError };
}

export async function noteSendFailure(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (error) {
    const store = outcome.getStore();
    if (store) store.sendError = error;
    throw error;
  }
}
