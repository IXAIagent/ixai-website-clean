// v4D: shared locale types.

export type SupportedLocale = "zh-TW" | "en" | "ja" | "ko" | "zh-CN";

export type Namespace =
  | "common"
  | "nav"
  | "page"
  | "empty"
  | "dashboard"
  | "intelligence"
  | "market"
  | "portfolio"
  | "alerts"
  | "onboarding"
  | "settings"
  | "accounts"
  | "input"
  | "import"
  | "errors"
  | "status"
  | "copilot"
  | "engine";

export type Dictionary = {
  [namespace in Namespace]?: {
    [key: string]: string | { [nested: string]: string };
  };
};
