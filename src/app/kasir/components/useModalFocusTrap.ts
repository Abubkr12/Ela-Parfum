"use client";

import { RefObject, useEffect, useRef } from "react";

const activeTrapStack: symbol[] = [];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface UseModalFocusTrapOptions {
  onEscape?: () => void;
  focusSelector?: string;
}

export function useModalFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options?: UseModalFocusTrapOptions
) {
  const onEscapeRef = useRef(options?.onEscape);
  onEscapeRef.current = options?.onEscape;

  const focusSelectorRef = useRef(options?.focusSelector);
  focusSelectorRef.current = options?.focusSelector;

  useEffect(() => {
    if (!isOpen) return;

    const trapId = Symbol("modal-trap");
    const previousFocus =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    activeTrapStack.push(trapId);

    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) {
      if (focusSelectorRef.current) {
        const target = container.querySelector<HTMLElement>(focusSelectorRef.current);
        if (target) {
          target.focus({ preventScroll: true });
        } else {
          container.focus({ preventScroll: true });
        }
      } else {
        container.focus({ preventScroll: true });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTrapStack[activeTrapStack.length - 1] !== trapId) return;

      if (e.key === "Escape" && onEscapeRef.current) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onEscapeRef.current();
        return;
      }

      if (e.key === "Tab" && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(
          (el) => el.tabIndex >= 0 && (el.offsetParent !== null || el === document.activeElement)
        );

        if (focusables.length === 0) {
          e.preventDefault();
          containerRef.current.focus({ preventScroll: true });
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement as HTMLElement | null;
        const containerEl = containerRef.current;

        if (e.shiftKey) {
          if (!current || current === containerEl || current === first || !containerEl.contains(current)) {
            e.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else {
          if (!current || current === containerEl || current === last || !containerEl.contains(current)) {
            e.preventDefault();
            first.focus({ preventScroll: true });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      const idx = activeTrapStack.lastIndexOf(trapId);
      if (idx !== -1) {
        activeTrapStack.splice(idx, 1);
      }
      if (previousFocus && typeof document !== "undefined" && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef]);
}
