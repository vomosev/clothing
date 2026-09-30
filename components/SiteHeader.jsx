'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import Badge from './ui/Badge';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop?sort=newest', label: 'New Drops' },
  { href: '/pricing', label: 'Membership' },
  { href: '/billing', label: 'Billing' },
  { href: '/account', label: 'Account' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);

  let cartCount = 0;
  try {
    const cart = useCart();
    cartCount = cart && typeof cart.count === 'number' ? cart.count : 0;
  } catch (err) {
    cartCount = 0;
  }

  let user = null;
  let authStatus = 'anonymous';
  let logout = null;
  try {
    const auth = useAuth();
    if (auth) {
      user = auth.user || null;
      authStatus = auth.status || 'anonymous';
      logout = auth.logout;
    }
  } catch (err) {
    user = null;
  }

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close the panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Body scroll lock + focus trap + Escape handling.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';

    const getFocusable = () => {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else if (panelRef.current) {
      panelRef.current.focus();
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      } else if (toggleRef.current) {
        toggleRef.current.focus();
      }
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    if (typeof logout === 'function') {
      try {
        await logout();
      } catch (err) {
        /* the auth context surfaces its own error state */
      }
    }
  };

  const isActive = (href) => {
    const base = href.split('?')[0];
    if (base === '/') return pathname === '/';
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <Link href="/" className="site-header__wordmark" onClick={closeMenu}>
          MONOLITH
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <ul className="site-nav__list">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="site-nav__item">
                <Link
                  href={link.href}
                  className={
                    isActive(link.href) ? 'site-nav__link is-active' : 'site-nav__link'
                  }
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <Link href="/cart" className="site-header__cart" aria-label={`Bag, ${cartCount} items`}>
            <span className="site-header__cart-label">Bag</span>
            <Badge tone={cartCount > 0 ? 'accent' : 'neutral'}>{cartCount}</Badge>
          </Link>

          <span className="site-header__auth">
            {authStatus === 'authenticated' && user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <Button as="link" href="/login" variant="secondary" size="sm">
                Log in
              </Button>
            )}
          </span>

          <button
            type="button"
            ref={toggleRef}
            className="site-header__toggle"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="site-header__toggle-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="site-menu" role="presentation">
          <div
            className="site-menu__backdrop"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            id="site-mobile-menu"
            className="site-menu__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            ref={panelRef}
            tabIndex={-1}
          >
            <ul className="site-menu__list">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="site-menu__item">
                  <Link
                    href={link.href}
                    className={
                      isActive(link.href) ? 'site-menu__link is-active' : 'site-menu__link'
                    }
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="site-menu__item">
                <Link href="/cart" className="site-menu__link" onClick={closeMenu}>
                  Bag ({cartCount})
                </Link>
              </li>
            </ul>

            <div className="site-menu__actions">
              {authStatus === 'authenticated' && user ? (
                <Button variant="secondary" size="md" onClick={handleSignOut}>
                  Sign out
                </Button>
              ) : (
                <>
                  <Button as="link" href="/login" variant="primary" size="md" onClick={closeMenu}>
                    Log in
                  </Button>
                  <Button as="link" href="/signup" variant="ghost" size="md" onClick={closeMenu}>
                    Create account
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}