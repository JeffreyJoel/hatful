// Shared class strings from the designs, so every screen's fields and buttons match.

const focusGold = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold";
const focusBerry = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-berry";

// Inputs on spruce screens (Join, New).
export const fieldOnSpruce = `h-[52px] w-full rounded-[14px] border-[1.5px] border-spruce-line bg-spruce-deep px-4 text-base text-white placeholder:text-[#8FB0A2] ${focusGold}`;
export const labelOnSpruce = "text-[13px] font-medium text-on-spruce-soft";

export const primaryButton = `press flex h-[58px] w-full items-center justify-center rounded-[18px] bg-berry font-display text-[19px] font-bold text-white disabled:opacity-70`;
export const primaryOnSpruce = `${primaryButton} ${focusGold}`;
export const primaryOnSnow = `${primaryButton} ${focusBerry}`;

export const alertBox = "rounded-xl bg-gold px-3 py-2.5 text-[13px] text-ink";
