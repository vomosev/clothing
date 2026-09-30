'use client';

import React from 'react';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Card({
  as: Tag = 'div',
  padded = true,
  raised = false,
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cx(
        'card',
        padded && 'card--padded',
        raised && 'card--raised',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ as: Tag = 'header', className, children, ...rest }) {
  return (
    <Tag className={cx('card__header', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardBody({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('card__body', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardFooter({ as: Tag = 'footer', className, children, ...rest }) {
  return (
    <Tag className={cx('card__footer', className)} {...rest}>
      {children}
    </Tag>
  );
}