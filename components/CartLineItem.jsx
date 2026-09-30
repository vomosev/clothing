'use client';

import Link from 'next/link';
import ProductMedia from './ProductMedia';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { formatPrice } from '../lib/format';

export default function CartLineItem({ item, onQuantityChange, onRemove }) {
  if (!item) return null;

  const quantity = Number(item.quantity) || 1;
  const unitPrice = Number(item.price_cents) || 0;
  const lineTotal = unitPrice * quantity;

  const decrease = () => {
    if (typeof onQuantityChange !== 'function') return;
    if (quantity <= 1) {
      if (typeof onRemove === 'function') onRemove();
      return;
    }
    onQuantityChange(quantity - 1);
  };

  const increase = () => {
    if (typeof onQuantityChange !== 'function') return;
    onQuantityChange(Math.min(quantity + 1, 10));
  };

  return (
    <li className="cart-line">
      <div className="cart-line__media">
        <ProductMedia imageKey={item.imageKey} name={item.name} />
      </div>

      <div className="cart-line__body">
        <div className="cart-line__heading">
          <Link href={`/product/${item.slug}`} className="cart-line__name order-item__name">
            {item.name}
          </Link>
          <div className="cluster cart-line__meta">
            {item.size ? <Badge tone="neutral">Size {item.size}</Badge> : null}
            <span className="cart-line__unit">{formatPrice(unitPrice)} each</span>
          </div>
        </div>

        <div className="cart-line__controls">
          <div className="qty" role="group" aria-label={`Quantity for ${item.name}`}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={decrease}
              aria-label={quantity <= 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
            >
              &minus;
            </Button>
            <span className="qty__value" aria-live="polite">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={increase}
              disabled={quantity >= 10}
              aria-label={`Increase quantity of ${item.name}`}
            >
              +
            </Button>
          </div>

          <span className="cart-line__total price">{formatPrice(lineTotal)}</span>

          <Button
            variant="danger"
            size="sm"
            type="button"
            onClick={() => {
              if (typeof onRemove === 'function') onRemove();
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}