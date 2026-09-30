'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card, { CardBody, CardFooter, CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import Badge from '../../../components/ui/Badge';
import { completePayment } from '../../../lib/api';
import { formatPrice } from '../../../lib/format';
import { useCart } from '../../../context/CartContext';

const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 3000;

function toneForStatus(status) {
  if (status === 'paid') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'canceled') return 'warning';
  return 'neutral';
}

function headingForStatus(status) {
  if (status === 'paid') return 'Payment confirmed';
  if (status === 'failed') return 'Payment failed';
  if (status === 'canceled') return 'Payment cancelled';
  return 'Still confirming your payment';
}

function copyForStatus(status, kind) {
  if (status === 'paid') {
    return kind === 'subscription'
      ? 'Your Inner Circle membership is active. Early access, member pricing and free shipping are live on your account from now on.'
      : 'Thanks for the order. A receipt is on its way to your inbox and your order is now queued for dispatch.';
  }
  if (status === 'failed') {
    return 'The provider declined this payment and nothing was charged. You can pick a different payment method and try again.';
  }
  if (status === 'canceled') {
    return 'You closed the payment window before it completed, so nothing was charged.';
  }
  return 'The provider has not confirmed this payment yet. Leave this page open — we will keep checking for a little longer.';
}

function SuccessPanel() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('ref');
  const { clear } = useCart();

  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const clearedRef = useRef(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const check = useCallback(
    async (attempt) => {
      if (!reference) return;
      try {
        const data = await completePayment(reference);
        if (!mountedRef.current) return;
        setResult(data);
        setError(null);
        setAttempts(attempt);

        if (data && data.status === 'pending' && attempt < MAX_POLLS) {
          setStatus('polling');
          timerRef.current = setTimeout(() => check(attempt + 1), POLL_INTERVAL_MS);
        } else {
          setStatus('done');
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err && err.message ? err.message : 'We could not reach the payment service.');
        setStatus('error');
      }
    },
    [reference]
  );

  useEffect(() => {
    if (!reference) {
      setStatus('missing');
      return undefined;
    }
    setStatus('loading');
    setAttempts(0);
    check(1);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reference, check]);

  useEffect(() => {
    if (
      result &&
      result.status === 'paid' &&
      result.kind !== 'subscription' &&
      !clearedRef.current
    ) {
      clearedRef.current = true;
      try {
        clear();
      } catch (err) {
        clearedRef.current = false;
      }
    }
  }, [result, clear]);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('loading');
    setAttempts(0);
    check(1);
  }, [check]);

  if (status === 'missing') {
    return (
      <EmptyState
        tone="error"
        title="No payment reference found"
        description="This page needs a payment reference in the address to confirm an order. Open the link from your payment provider, or start again from the pricing page."
        action={
          <div className="cluster">
            <Button href="/pricing" variant="primary" size="md">
              Back to pricing
            </Button>
            <Button href="/shop" variant="secondary" size="md">
              Continue shopping
            </Button>
          </div>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        tone="error"
        title="We could not confirm this payment"
        description={error || 'The payment service did not respond. Your card has not been charged twice — check again in a moment.'}
        action={
          <div className="cluster">
            <Button variant="primary" size="md" onClick={retry}>
              Check again
            </Button>
            <Button href="/account" variant="secondary" size="md">
              Go to account
            </Button>
          </div>
        }
      />
    );
  }

  if (status === 'loading' || status === 'polling') {
    return (
      <Card raised>
        <CardBody>
          <div className="billing-status" aria-live="polite">
            <Spinner size="lg" label="Confirming payment" />
            <h2>Confirming your payment</h2>
            <p>
              {status === 'polling'
                ? `Waiting for the provider to confirm. Check ${attempts} of ${MAX_POLLS}.`
                : 'Talking to the payment provider. This usually takes a few seconds.'}
            </p>
            <p className="text-muted">Reference: {reference}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const finalStatus = result ? result.status : 'pending';
  const amountLabel =
    result && typeof result.amount === 'number'
      ? formatPrice(result.amount, result.currency || 'USD')
      : null;

  return (
    <Card raised>
      <CardHeader>
        <div className="cluster cluster--between">
          <h2>{headingForStatus(finalStatus)}</h2>
          <Badge tone={toneForStatus(finalStatus)}>{finalStatus}</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <p>{copyForStatus(finalStatus, result && result.kind)}</p>
        <dl className="summary-list">
          <div className="summary-list__row">
            <dt>Reference</dt>
            <dd className="order-item__name">{reference}</dd>
          </div>
          {amountLabel ? (
            <div className="summary-list__row">
              <dt>Amount</dt>
              <dd>{amountLabel}</dd>
            </div>
          ) : null}
          {result && result.kind ? (
            <div className="summary-list__row">
              <dt>Type</dt>
              <dd>{result.kind === 'subscription' ? 'Membership' : 'One-off purchase'}</dd>
            </div>
          ) : null}
          {result && result.itemId ? (
            <div className="summary-list__row">
              <dt>Item</dt>
              <dd className="order-item__name">{result.itemId}</dd>
            </div>
          ) : null}
        </dl>
      </CardBody>
      <CardFooter>
        <div className="cluster">
          {finalStatus === 'paid' && result && result.kind === 'subscription' ? (
            <Button href="/billing" variant="primary" size="md">
              View membership
            </Button>
          ) : (
            <Button href="/account" variant="primary" size="md">
              View orders
            </Button>
          )}
          <Button href="/shop" variant="secondary" size="md">
            Continue shopping
          </Button>
          {finalStatus === 'failed' || finalStatus === 'canceled' ? (
            <Button href="/pricing" variant="ghost" size="md">
              Try another method
            </Button>
          ) : null}
          {finalStatus === 'pending' ? (
            <Button variant="ghost" size="md" onClick={retry}>
              Check again
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}

function SuccessFallback() {
  return (
    <Card raised>
      <CardBody>
        <div className="billing-status">
          <Spinner size="lg" label="Loading payment result" />
          <h2>Loading payment result</h2>
          <p>One moment while we read your payment reference.</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function BillingSuccessPage() {
  return (
    <section className="page-section stack">
      <header className="page-header">
        <h1>Payment status</h1>
        <p>
          We check directly with the payment provider before anything is marked as paid, so this
          page is the source of truth for your order or membership.
        </p>
      </header>
      <Suspense fallback={<SuccessFallback />}>
        <SuccessPanel />
      </Suspense>
    </section>
  );
}