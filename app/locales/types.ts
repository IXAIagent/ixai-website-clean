// v4D: shared locale types.

export type SupportedLocale = "zh-TW" | "en" | "ja" | "ko" | "zh-CN";

export type Namespace =
  | "common"
  | "dashboard"
  | "intelligence"
  | "market"
  | "portfolio"
  | "alerts"
  | "onboarding"
  | "settings"
  | "accounts"
  | "errors"
  | "status"
  | "copilot"
  | "engine";

export type Dictionary = {
  [namespace in Namespace]?: {
    [key: string]: string | { [nested: string]: string };
  };
};
