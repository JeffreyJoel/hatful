// Pure, so node --test can load it: no server-only, no @/ imports.

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");

export function renderSignInCode(input: {
  code: string;
  expiresInSeconds: number;
  html: string;
  text: string;
}): { subject: string; html: string; text: string } {
  // Digits only: the code is the one caller-supplied value that reaches the HTML.
  const code = input.code.replace(/\D/g, "");
  const minutes = Math.max(1, Math.round(input.expiresInSeconds / 60));
  const values = { code, expires_in: minutes === 1 ? "1 minute" : `${minutes} minutes` };
  return {
    subject: `Your Hatful code: ${code}`,
    // The leading comment and "##" lines are notes to template editors.
    html: fill(input.html.replace(/^<!--[\s\S]*?-->\s*/, ""), values),
    text: fill(input.text.replace(/^##.*\n/gm, ""), values),
  };
}
