"use client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Talks to this app's own /api/auth, so sign-in sets the session cookie here.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
