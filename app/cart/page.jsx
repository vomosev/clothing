'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CartLineItem from '../../components/CartLineItem';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { createOrder, getPaymentProviders } from '../../lib/api';
import { formatPrice } from '../../lib/format';

const SHIPPING_THRESHOLD_CENTS = 15000;
const SHIPPING_FLAT_CENTS = 900;

export default function CartPage() {
  const router = useRouter();
  const { items, setQuantity, removeItem, subtotalCents, count, hydrated } = useCart();
  const { user, status } = useAuth();

  const [providers, setProviders] = useState([]);
  const [providersStatus, setProvidersStatus] = useState('loading');
  const [provider, setProvider] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      setProvidersStatus('loading');
      try {
        const data = await getPaymentProviders();
        if (cancelled) return;
        const list = Array.isArray(data?.providers) ? data.providers : [];
        setProviders(list);
        setProvider(list.length > 0 ? list[0].id : '');
        setProvidersStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setProviders([]);
        setProvidersStatus('error');
      }
    }

    loadProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  const shippingCents =
    items.length === 0 || subtotalCents >= SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const totalCents = subtotalCents + shippingCents;

  async function handleCheckout(selectedProvider) {
    setError('');

    if (items.length === 0) return;

    if (status === 'loading') return;

    if (status !== 'authenticated' || !user) {
      router.push('/login?next=/cart');
      return;
    }

    if (!selectedProvider) {
      setError('Choose a payment method to continue.');
      return;
    }

    setSubmitting(true);
    try {
      // Only identifiers and quantities are sent — the server re-reads every
      // price from the database and computes the amount to charge.
      const payload = {
        provider: selectedProvider,
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
      };
      const result = await createOrder(payload);
      if (result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setError('Checkout could not be started. Please try again in a moment.');
      setSubmitting(false);
    } catch (err) {
      setError(err && err.message ? err.message : 'Checkout failed. Please try again.');
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <section className="page-section stack">
        <h1>Your bag</h1>
        <div className="summary-pending">
          <Spinner size="sm" label="Loading your bag" />
          <span className="text-muted text-sm">Loading your bag…</span>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="page-section stack">
        <h1>Your bag</h1>
        <EmptyState
          title="Your bag is empty"
          description="Nothing in here yet. Browse the current drop and add a piece to get started."
          action={
            <Button href="/shop" variant="primary" size="md">
              Shop the drop
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="page-section stack">
      <h1>Your bag</h1>
      <p className="text-muted">
        {count} {count === 1 ? 'item' : 'items'} reserved for the next 30 minutes. Sizes are limited
        to the current run.
      </p>

      <div className="cart-layout">
        <div className="cart-lines stack">
          {items.map((item) => (
            <CartLineItem
              key={`${item.productId}-${item.size}`}
              item={item}
              onQuantityChange={(quantity) => setQuantity(item.productId, item.size, quantity)}
              onRemove={() => removeItem(item.productId, item.size)}
            />
          ))}
        </div>

        <Card raised className="cart-summary">
          <CardHeader>
            <h2 className="card__title">Order summary</h2>
          </CardHeader>
          <CardBody>
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Subtotal</dt>
                <dd className="price">{formatPrice(subtotalCents, 'USD')}</dd>
              </div>
              <div className="summary-row">
                <dt>Shipping</dt>
                <dd className="price">
                  {shippingCents === 0 ? 'Free' : formatPrice(shippingCents, 'USD')}
                </dd>
              </div>
              <div className="summary-row summary-row--total">
                <dt>Total</dt>
                <dd className="price price--lg">{formatPrice(totalCents, 'USD')}</dd>
              </div>
            </dl>

            <p className="text-muted text-sm">
              Standard shipping is free on orders over {formatPrice(SHIPPING_THRESHOLD_CENTS, 'USD')}.
              Duties and taxes are calculated at the payment step. Your total is always recalculated
              by our servers before you are charged.
            </p>

            {providersStatus === 'loading' ? (
              <div className="summary-pending">
                <Spinner size="sm" label="Loading payment methods" />
                <span className="text-muted text-sm">Loading payment methods…</span>
              </div>
            ) : null}

            {providersStatus === 'error' ? (
              <p className="field__error" role="alert">
                Payment methods could not be loaded. Refresh the page and try again.
              </p>
            ) : null}

            {providersStatus === 'ready' && providers.length === 0 ? (
              <p className="text-muted text-sm">
                Payments are not available yet. Please check back shortly — your bag is saved on this
                device.
              </p>
            ) : null}

            {error ? (
              <p className="field__error" role="alert">
                {error}
              </p>
            ) : null}
          </CardBody>
          <CardFooter>
            <div className="stack stack--tight">
              {providers.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === provider ? 'primary' : 'secondary'}
                  size="lg"
                  loading={submitting && provider === item.id}
                  disabled={submitting || status === 'loading'}
                  onClick={() => {
                    setProvider(item.id);
                    handleCheckout(item.id);
                  }}
                >
                  {`Checkout with ${item.label}`}
                </Button>
              ))}

              {providers.length === 0 ? (
                <Button href="/shop" variant="secondary" size="md">
                  Keep shopping
                </Button>
              ) : null}

              {status === 'anonymous' && providers.length > 0 ? (
                <p className="text-muted text-sm">
                  You will be asked to sign in before payment so we can attach the order to your
                  account.
                </p>
              ) : null}
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="cluster">
        <Button href="/shop" variant="ghost" size="md">
          Continue shopping
        </Button>
        <Button href="/pricing" variant="ghost" size="md">
          See membership
        </Button>
      </div>
    </section>
  );
}