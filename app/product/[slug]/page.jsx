'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProduct } from '../../../lib/api';
import ProductMedia from '../../../components/ProductMedia';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import Card, { CardBody } from '../../../components/ui/Card';
import { useCart } from '../../../context/CartContext';
import { formatPrice, pluralize } from '../../../lib/format';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';

  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const load = useCallback(() => {
    if (!slug) {
      setStatus('missing');
      return () => {};
    }
    const controller = new AbortController();
    let active = true;

    setStatus('loading');
    setErrorMessage('');

    getProduct(slug, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const found = data && data.product ? data.product : data;
        if (!found || !found.slug) {
          setStatus('missing');
          return;
        }
        setProduct(found);
        const sizes = Array.isArray(found.sizes) ? found.sizes : [];
        const firstAvailable = sizes.find((s) => Number(s.stock) > 0) || sizes[0];
        setSize(firstAvailable ? firstAvailable.size : '');
        setQuantity(1);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active || err?.name === 'AbortError') return;
        if (err && err.status === 404) {
          setStatus('missing');
          return;
        }
        setErrorMessage(
          err && err.message ? err.message : 'We could not load this product right now.'
        );
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), 2600);
    return () => clearTimeout(timer);
  }, [added]);

  if (status === 'loading') {
    return (
      <section className="product-detail" aria-busy="true">
        <div className="product-detail__grid">
          <div className="skeleton skeleton--media" aria-hidden="true" />
          <div className="stack">
            <div className="skeleton skeleton--title" aria-hidden="true" />
            <div className="skeleton skeleton--line" aria-hidden="true" />
            <div className="skeleton skeleton--line" aria-hidden="true" />
            <div className="skeleton skeleton--block" aria-hidden="true" />
          </div>
        </div>
        <p className="visually-hidden">Loading product details</p>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="product-detail">
        <EmptyState
          tone="error"
          title="This page did not load"
          description={errorMessage || 'The store API did not respond. Check your connection and try again.'}
          action={
            <Button variant="primary" size="md" onClick={load}>
              Try again
            </Button>
          }
        />
      </section>
    );
  }

  if (status === 'missing' || !product) {
    return (
      <section className="product-detail">
        <EmptyState
          title="This drop has sold out or moved"
          description="We could not find that piece. Browse the current rail to see what is still in stock."
          action={
            <Button href="/shop" variant="primary" size="md">
              Back to shop
            </Button>
          }
        />
      </section>
    );
  }

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const totalStock =
    typeof product.stock === 'number'
      ? product.stock
      : sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
  const soldOut = totalStock <= 0;
  const selectedRow = sizes.find((s) => s.size === size);
  const selectedStock = selectedRow ? Number(selectedRow.stock) || 0 : totalStock;
  const maxQuantity = Math.max(1, Math.min(selectedStock > 0 ? selectedStock : 1, 10));
  const canAdd = !soldOut && (sizes.length === 0 || Boolean(size)) && selectedStock > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size: size || 'One size',
      price_cents: product.priceCents,
      quantity,
      imageKey: product.imageKey,
    });
    setAdded(true);
  };

  return (
    <section className="product-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ul className="cluster">
          <li>
            <a href="/shop">Shop</a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="breadcrumbs__current">{product.name}</li>
        </ul>
      </nav>

      <div className="product-detail__grid">
        <div className="product-detail__media">
          <ProductMedia imageKey={product.imageKey} name={product.name} priority />
        </div>

        <div className="product-detail__info stack">
          <div className="cluster">
            {product.badge ? <Badge tone="accent">{product.badge}</Badge> : null}
            {soldOut ? <Badge tone="danger">Sold out</Badge> : null}
            {product.category ? <Badge tone="neutral">{product.category}</Badge> : null}
          </div>

          <h1 className="product-detail__title">{product.name}</h1>
          <p className="price price--lg">{formatPrice(product.priceCents, product.currency || 'USD')}</p>
          <p className="product-detail__description">{product.description}</p>

          {sizes.length > 0 ? (
            <div className="size-picker">
              <h2 className="size-picker__label" id="size-picker-label">
                Select a size
              </h2>
              <div className="cluster" role="group" aria-labelledby="size-picker-label">
                {sizes.map((row) => {
                  const out = Number(row.stock) <= 0;
                  const selected = row.size === size;
                  return (
                    <button
                      key={row.size}
                      type="button"
                      className={`size-option${selected ? ' size-option--selected' : ''}`}
                      onClick={() => {
                        setSize(row.size);
                        setQuantity(1);
                      }}
                      disabled={out}
                      aria-pressed={selected}
                    >
                      {row.size}
                    </button>
                  );
                })}
              </div>
              {selectedStock > 0 && selectedStock <= 5 ? (
                <p className="product-detail__stock">
                  Only {selectedStock} {pluralize(selectedStock, 'piece')} left in {size}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="quantity">
            <h2 className="quantity__label" id="quantity-label">
              Quantity
            </h2>
            <div className="quantity__stepper cluster" aria-labelledby="quantity-label">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="quantity__value" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="cluster">
            <Button variant="primary" size="lg" onClick={handleAdd} disabled={!canAdd}>
              {soldOut ? 'Sold out' : 'Add to bag'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => router.push('/cart')}>
              View bag
            </Button>
          </div>

          <p className="product-detail__feedback" role="status" aria-live="polite">
            {added ? `${product.name} added to your bag.` : ''}
          </p>

          <Card raised>
            <CardBody>
              <h2 className="product-detail__meta-title">Shipping &amp; returns</h2>
              <p>
                Orders placed before 2pm ship the same working day from our London studio. Standard
                delivery lands in 3–5 days; Inner Circle members ship free on every order.
              </p>
              <ul>
                <li>Free returns within 30 days on unworn pieces with tags attached.</li>
                <li>Heavyweight cotton, garment dyed — expect a soft fade after the first wash.</li>
                <li>Fits boxy. Size down for a closer cut.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}