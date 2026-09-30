'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlanCard from '../../components/PlanCard';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  getPaymentPlans,
  getPaymentProviders,
  createCheckout,
} from '../../lib/api';

export default function PricingPage() {
  const router = useRouter();
  const { user, status: authStatus } = useAuth();

  const [state, setState] = useState({ status: 'loading', error: null });
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [busy, setBusy] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const load = useCallback(async () => {
    setState({ status: 'loading', error: null });
    try {
      const [plansRes, providersRes] = await Promise.all([
        getPaymentPlans(),
        getPaymentProviders(),
      ]);
      setPlans(Array.isArray(plansRes?.plans) ? plansRes.plans : []);
      setProducts(Array.isArray(plansRes?.products) ? plansRes.products : []);
      setProviders(
        Array.isArray(providersRes?.providers) ? providersRes.providers : []
      );
      setState({ status: 'ready', error: null });
    } catch (err) {
      setState({
        status: 'error',
        error:
          err && err.message
            ? err.message
            : 'We could not load membership pricing right now.',
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleCheckout = useCallback(
    async (provider, item, kind) => {
      setCheckoutError(null);

      if (authStatus === 'loading') return;
      if (!user) {
        router.push('/login?next=/pricing');
        return;
      }

      const key = `${kind}:${item.id}:${provider}`;
      setBusy(key);
      try {
        const body =
          kind === 'plan'
            ? { provider, planId: item.id }
            : { provider, productId: item.id };
        const res = await createCheckout(body);
        if (res && res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        setCheckoutError(
          'The payment provider did not return a checkout link. Please try another provider.'
        );
        setBusy(null);
      } catch (err) {
        setCheckoutError(
          err && err.message
            ? err.message
            : 'Checkout could not be started. Please try again.'
        );
        setBusy(null);
      }
    },
    [authStatus, user, router]
  );

  const busyProviderFor = (kind, itemId) => {
    if (!busy) return null;
    const [bKind, bId, bProvider] = busy.split(':');
    return bKind === kind && bId === itemId ? bProvider : null;
  };

  return (
    <section className="page">
      <header className="page__head stack">
        <h1>Membership &amp; bundles</h1>
        <p>
          Join the Inner Circle for early access to every MONOLITH drop, or grab a
          bundle and gift card outright. Prices are in US dollars and billed
          securely by our payment partners — we never see your card details.
        </p>
      </header>

      {state.status === 'loading' && (
        <div className="product-grid" aria-busy="true" aria-live="polite">
          <div className="skeleton skeleton--plan" />
          <div className="skeleton skeleton--plan" />
          <div className="skeleton skeleton--plan" />
        </div>
      )}

      {state.status === 'error' && (
        <EmptyState
          tone="error"
          title="Pricing is unavailable"
          description={state.error}
          action={
            <Button variant="primary" size="md" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {state.status === 'ready' && (
        <>
          {checkoutError && (
            <div className="alert alert--danger" role="alert">
              <p>{checkoutError}</p>
            </div>
          )}

          {providers.length === 0 ? (
            <EmptyState
              title="Payments are not available yet"
              description="Our checkout providers are still being connected. Browse the current drop in the meantime — you can still shop everything in the store."
              action={
                <Button href="/shop" variant="primary" size="md">
                  Browse the shop
                </Button>
              }
            />
          ) : null}

          <h2>Membership plans</h2>
          {plans.length === 0 ? (
            <EmptyState
              title="No membership plans yet"
              description="Inner Circle memberships open with the next seasonal drop. Check back soon or subscribe to the drop list from the footer."
            />
          ) : (
            <div className="product-grid product-grid--plans">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  item={plan}
                  kind="plan"
                  providers={providers}
                  onCheckout={(provider) => handleCheckout(provider, plan, 'plan')}
                  busyProvider={busyProviderFor('plan', plan.id)}
                />
              ))}
            </div>
          )}

          <h2>Bundles &amp; gift cards</h2>
          {products.length === 0 ? (
            <EmptyState
              title="No bundles right now"
              description="Bundles rotate with each drop. Everything currently in stock is listed in the shop."
              action={
                <Button href="/shop" variant="secondary" size="md">
                  Go to shop
                </Button>
              }
            />
          ) : (
            <div className="product-grid product-grid--plans">
              {products.map((product) => (
                <PlanCard
                  key={product.id}
                  item={product}
                  kind="product"
                  providers={providers}
                  onCheckout={(provider) =>
                    handleCheckout(provider, product, 'product')
                  }
                  busyProvider={busyProviderFor('product', product.id)}
                />
              ))}
            </div>
          )}

          <h2>Already a member?</h2>
          <p>
            Manage your renewal date, switch plans or cancel at any time from your
            billing page.
          </p>
          <div className="cluster">
            <Button href="/billing" variant="secondary" size="md">
              View billing
            </Button>
            <Button href="/account" variant="ghost" size="md">
              Account
            </Button>
          </div>
        </>
      )}
    </section>
  );
}