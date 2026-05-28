"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const EXEMPT_PATHS = ["/onboarding", "/setup", "/login", "/install"];

export function onboardedKey(userId: string | null | undefined) {
  return `adflow:onboarded:${userId ?? "guest"}`;
}

export default function OnboardingGuard() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return;

    const userId = session?.user?.email ?? "guest";
    const key = onboardedKey(userId);

    try {
      // 구버전 키 마이그레이션
      const legacy = "adflow:onboarded";
      if (!localStorage.getItem(key) && localStorage.getItem(legacy)) {
        localStorage.setItem(key, "true");
        localStorage.removeItem(legacy);
      }
      if (!localStorage.getItem(key)) {
        window.location.replace("/onboarding");
      }
    } catch {
      /* storage 사용 불가 — 무시 */
    }
  }, [pathname, status, session]);

  return null;
}
