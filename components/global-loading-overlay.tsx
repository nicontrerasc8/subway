"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type LoadingMode = "route" | "filter";

const MIN_VISIBLE_MS = 420;
const QUIET_PERIOD_MS = 260;
const ROUTE_FALLBACK_MS = 5000;

function shouldHandleAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("rel") === "external") return false;

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;

    const current = new URL(window.location.href);
    return url.pathname !== current.pathname || url.search !== current.search;
  } catch {
    return false;
  }
}

export function GlobalLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<LoadingMode>("route");

  const shownAtRef = useRef<number | null>(null);
  const waitingRouteRef = useRef(false);
  const settleObserverRef = useRef<MutationObserver | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRouteKeyRef = useRef(routeKey);

  const clearSettleObserver = useCallback(() => {
    settleObserverRef.current?.disconnect();
    settleObserverRef.current = null;

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearFallbackTimer = useCallback(() => {
    if (routeFallbackTimerRef.current) {
      clearTimeout(routeFallbackTimerRef.current);
      routeFallbackTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearSettleObserver();
    clearFallbackTimer();
  }, [clearFallbackTimer, clearSettleObserver]);

  const hideOverlay = useCallback(() => {
    setVisible(false);
    waitingRouteRef.current = false;
    shownAtRef.current = null;
    clearAllTimers();
  }, [clearAllTimers]);

  const hideWithMinimumDelay = useCallback(() => {
    const shownAt = shownAtRef.current;
    const elapsed = shownAt ? Date.now() - shownAt : MIN_VISIBLE_MS;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    clearSettleObserver();
    clearFallbackTimer();

    settleTimerRef.current = setTimeout(() => {
      hideOverlay();
    }, remaining);
  }, [clearFallbackTimer, clearSettleObserver, hideOverlay]);

  const beginSettleWatch = useCallback(() => {
    clearSettleObserver();

    const target = document.querySelector("main") ?? document.body;

    function scheduleHide() {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }

      settleTimerRef.current = setTimeout(() => {
        hideWithMinimumDelay();
      }, QUIET_PERIOD_MS);
    }

    scheduleHide();

    settleObserverRef.current = new MutationObserver(() => {
      scheduleHide();
    });

    settleObserverRef.current.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }, [clearSettleObserver, hideWithMinimumDelay]);

  const showOverlay = useCallback(
    (nextMode: LoadingMode) => {
      clearAllTimers();
      setMode(nextMode);
      setVisible(true);
      shownAtRef.current = Date.now();
      waitingRouteRef.current = true;

      routeFallbackTimerRef.current = setTimeout(() => {
        hideOverlay();
      }, ROUTE_FALLBACK_MS);
    },
    [clearAllTimers, hideOverlay],
  );

  useEffect(() => {
    if (lastRouteKeyRef.current === routeKey) return;
    lastRouteKeyRef.current = routeKey;

    if (waitingRouteRef.current) {
      beginSettleWatch();
    }
  }, [beginSettleWatch, routeKey]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;

      if (shouldHandleAnchor(anchor)) {
        showOverlay("route");
      }
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      showOverlay("route");
    }

    function handlePopState() {
      showOverlay("route");
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
      clearAllTimers();
    };
  }, [clearAllTimers, showOverlay]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-950/28 backdrop-blur-[3px]" />
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/20">
        <div className="h-full w-1/3 animate-[loading-slide_1.1s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,#86cf47_0%,#4fa3ff_50%,#f4a261_100%)]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex min-w-[240px] items-center gap-4 rounded-[1.75rem] border border-white/15 bg-[#07131f]/92 px-5 py-4 text-white shadow-[0_24px_60px_rgba(7,19,31,0.35)]">
          <div className="rounded-2xl bg-white/10 p-3">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {mode === "filter" ? "Actualizando filtros" : "Cargando vista"}
            </p>
            <p className="mt-1 text-xs text-white/72">
              {mode === "filter"
                ? "Esperando a que la vista termine de renderizar."
                : "Esperando a que la siguiente pantalla termine de cargar."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
