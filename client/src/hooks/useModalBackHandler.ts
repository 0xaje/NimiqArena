import { useEffect, useRef } from "react";

/**
 * Native Mini App & Mobile Web Ergonomics:
 * Intercepts the browser/hardware back button (or Android swipe back)
 * so that pressing Back dismisses the active modal instead of leaving the application.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isOpen) {
      isPushedRef.current = false;
      return;
    }

    // Modal opened: push a history state so physical back pops the modal
    if (!isPushedRef.current) {
      try {
        window.history.pushState({ modalOpen: true }, "");
        isPushedRef.current = true;
      } catch {}
    }

    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);
}
