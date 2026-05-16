// v4D: locale registry. Maps SupportedLocale → Dictionary.

import en from "./en";
import ja from "./ja";
import ko from "./ko";
import type { Dictionary, SupportedLocale } from "./types";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";

export const FALLBACK_LOCALE: SupportedLocale = "en";

export const registry: Record<SupportedLocale, Dictionary> = {
  "zh-TW": zhTW,
  en,
  ja,
  ko,
  "zh-CN": zhCN,
};

export type { Dictionary, SupportedLocale } from "./types";
