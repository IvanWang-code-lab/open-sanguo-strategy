import type { CommandPreferences } from "../types";

type UiSound = "command" | "battle" | "victory" | "warning";

// V12 预留本地音效入口。当前没有 public/assets/audio 资源时保持静音，不会抛错。
export const playUiSound = (_sound: UiSound, preferences?: CommandPreferences) => {
  if (!preferences?.soundEnabled) return;
};
