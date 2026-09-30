'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({ open, onClose, title, children, footer }) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  // Focus management: move focus in, trap it, restore on close
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const node = dialogRef.current;
    if (node) {
      const first = node.querySelector(FOCUSABLE);
      if (first instanceof HTMLElement) {
        first.focus();
      } else {
        node.focus();
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;
      const items = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el instanceof HTMLElement && el.offsetParent !== null,
      );
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === container) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const toRestore = previouslyFocused.current;
      if (toRestore && typeof toRestore.focus === 'function') {
        toRestore.focus();
      }
    };
  }, [open, handleClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal__header">
          {title ? (
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
          ) : (
            <span className="modal__title" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="modal__close"
            aria-label="Close dialog"
          >
            Close
          </Button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}