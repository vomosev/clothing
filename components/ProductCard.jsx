'use client';

import Link from 'next/link';
import Card from './ui/Card';
import Badge from './ui/Badge';
import ProductMedia from './ProductMedia';
import { formatPrice } from '../lib/format';

export default function ProductCard({ product }) {
  if (!product) return null;

  const {
    slug,
    name,
    category,
    priceCents,
    price_cents: priceCentsSnake,
    currency = 'USD',
    imageKey,
    image_key: imageKeySnake,
    badge,
    stock,
  } = product;

  const amount = typeof priceCents === 'number' ? priceCents : priceCentsSnake;
  const media = imageKey || imageKeySnake || slug || name;
  const soldOut = typeof stock === 'number' && stock <= 0;
  const href = slug ? `/product/${slug}` : '/shop';

  return (
    <Card className="product-card" padded={false}>
      <Link className="product-card__link" href={href} aria-label={`View ${name}`}>
        <div className="product-card__media">
          <ProductMedia imageKey={media} name={name} />
          {(soldOut || badge) && (
            <div className="product-card__badges">
              {soldOut ? (
                <Badge tone="danger">Sold out</Badge>
              ) : (
                <Badge tone="accent">{badge}</Badge>
              )}
            </div>
          )}
        </div>

        <div className="product-card__body">
          <h3 className="product-card__title">{name}</h3>
          {category ? <p className="product-card__meta">{category}</p> : null}
          <p className="price product-card__price">
            {typeof amount === 'number' ? formatPrice(amount, currency) : 'Price on request'}
          </p>
        </div>
      </Link>
    </Card>
  );
}