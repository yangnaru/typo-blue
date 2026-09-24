"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { PlainButton } from "@/components/plain-button";

const themes = [
  { value: "system", label: "시스템" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
];

const noopSubscribe = () => () => {};

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser, so the server and the first
  // client render show a neutral label.
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const index = Math.max(
    themes.findIndex(({ value }) => value === theme),
    0
  );
  const next = themes[(index + 1) % themes.length];

  return (
    <PlainButton
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={
        isHydrated
          ? `화면 테마: ${themes[index].label}. 누르면 ${next.label}(으)로 바뀝니다.`
          : "화면 테마 바꾸기"
      }
    >
      {isHydrated ? `테마: ${themes[index].label}` : "테마"}
    </PlainButton>
  );
}
