'use client';

import Link from 'next/link';
import Spinner from './Spinner';

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <Spinner size="sm" label="Working" /> : null}
      <span className="btn__label">{children}</span>
    </>
  );

  const isDisabled = Boolean(disabled || loading);

  if (href && !isDisabled) {
    const isExternal =
      typeof href === 'string' && /^(https?:)?\/\//.test(href);

    if (isExternal) {
      return (
        <a
          className={classes}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link className={classes} href={href} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && isDisabled) {
    return (
      <span className={classes} aria-disabled="true" role="link" {...rest}>
        {content}
      </span>
    );
  }

  const Component = as || 'button';

  if (Component !== 'button') {
    return (
      <Component
        className={classes}
        aria-disabled={isDisabled ? 'true' : undefined}
        aria-busy={loading ? 'true' : undefined}
        onClick={isDisabled ? undefined : onClick}
        {...rest}
      >
        {content}
      </Component>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
}