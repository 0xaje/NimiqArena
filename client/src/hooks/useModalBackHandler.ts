import { useEffect, useRef } from "react";

/**
 * Native Mini App & Mobile Web Ergonomics:
 * Intercepts the browser/hardware back button (or Android swipe back)
 * so that pressing Back dismisses the active modal instead of leaving the application.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isOpen) {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.location.hash.includes("modal")) {
          window.history.back();
        }
      }
      return;
    }

    // Modal just opened: push a history state
    window.history.pushState(
      { modalOpen: true },
      "",
      window.location.pathname + window.location.search + "#modal"
    );
    isPushedRef.current = true;

    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, onClose]);
}
