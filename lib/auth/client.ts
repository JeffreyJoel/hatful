"use client";
import { createAuthClient } from "@neon/auth/next";

// Talks to the same-origin /api/auth proxy, so sign-in sets this app's session cookie.
export const authClient = createAuthClient();
