'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import {
  getSubscription,
  cancelSubscription,
  getManageUrl,
  getPaymentPlans,
} from '../../lib/api';
import { formatDate, formatPrice, formatInterval } from '../../lib/format';

const STATUS_TONES = {
  active: 'success',
  trialing: 'accent',
  past_due: 'warning',
  canceled: 'danger',
  incomplete: 'warning',
  paused: 'neutral',
};

function statusLabel(status) {
  if (!status) return 'Unknown';
  return String(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function BillingPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currency, setCurrency] = useState('USD');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [manageUrl, setManageUrl] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    setNotice('');
    try {
      const data = await getSubscription();
      setSubscription(data && data.subscription ? data.subscription : null);
      setStatus('ready');
    } catch (err) {
      setError(
        err && err.status === 401
          ? 'Sign in to view your membership and billing details.'
          : (err && err.message) || 'We could not load your billing details.'
      );
      setStatus('error');
      return;
    }

    try {
      const catalogue = await getPaymentPlans();
      setPlans(Array.isArray(catalogue?.plans) ? catalogue.plans : []);
      if (catalogue?.currency) setCurrency(catalogue.currency);
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!subscription) {
      setManageUrl(null);
      return () => {
        cancelled = true;
      };
    }
    setManageLoading(true);
    getManageUrl()
      .then((data) => {
        if (!cancelled) setManageUrl(data && data.url ? data.url : null);
      })
      .catch(() => {
        if (!cancelled) setManageUrl(null);
      })
      .finally(() => {
        if (!cancelled) setManageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subscription]);

  const plan = useMemo(() => {
    if (!subscription) return null;
    return plans.find((entry) => entry.id === subscription.planId) || null;
  }, [plans, subscription]);

  async function handleCancel() {
    setCanceling(true);
    setCancelError('');
    try {
      const data = await cancelSubscription();
      setSubscription(data && data.subscription ? data.subscription : null);
      setConfirmOpen(false);
      setNotice('Your membership has been scheduled to end. You keep access until the period ends.');
    } catch (err) {
      setCancelError((err && err.message) || 'We could not cancel the membership. Please try again.');
    } finally {
      setCanceling(false);
    }
  }

  if (status === 'loading') {
    return (
      <section className="stack">
        <h1>Billing</h1>
        <p>Checking your membership status.</p>
        <Card>
          <CardBody>
            <div className="billing-loading">
              <Spinner size="md" label="Loading billing details" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line" />
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="stack">
        <h1>Billing</h1>
        <EmptyState
          tone="error"
          title="Billing details unavailable"
          description={error}
          action={
            <div className="cluster">
              <Button onClick={load}>Try again</Button>
              <Button href="/login" variant="secondary">
                Log in
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  if (!subscription) {
    return (
      <section className="stack">
        <h1>Billing</h1>
        <p>
          You do not have an active Inner Circle membership. Join to unlock early access to every
          drop, free shipping and member pricing.
        </p>
        <EmptyState
          title="No active membership"
          description="Choose a membership on the pricing page to start getting drops 48 hours before everyone else."
          action={
            <div className="cluster">
              <Button href="/pricing">View memberships</Button>
              <Button href="/shop" variant="secondary">
                Browse the shop
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const tone = STATUS_TONES[subscription.status] || 'neutral';

  return (
    <section className="stack">
      <h1>Billing</h1>
      <p>Manage your Inner Circle membership, payment method and renewal date.</p>

      {notice ? (
        <Card raised>
          <CardBody>
            <p className="billing-notice">{notice}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card raised>
        <CardHeader>
          <div className="cluster cluster--between">
            <h2 className="card__title">{plan ? plan.name : subscription.planId || 'Membership'}</h2>
            <Badge tone={tone}>{statusLabel(subscription.status)}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <dl className="detail-list">
            <div className="detail-list__row">
              <dt>Plan</dt>
              <dd>{plan ? plan.name : subscription.planId || '—'}</dd>
            </div>
            {plan ? (
              <div className="detail-list__row">
                <dt>Price</dt>
                <dd>
                  {formatPrice(plan.amount, currency)}{' '}
                  {formatInterval(plan.interval, plan.intervalCount)}
                </dd>
              </div>
            ) : null}
            <div className="detail-list__row">
              <dt>{subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews on'}</dt>
              <dd>{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}</dd>
            </div>
            <div className="detail-list__row">
              <dt>Paid with</dt>
              <dd>{subscription.provider ? statusLabel(subscription.provider) : '—'}</dd>
            </div>
          </dl>

          {plan && Array.isArray(plan.features) && plan.features.length > 0 ? (
            <div className="stack">
              <h3>What is included</h3>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {subscription.cancelAtPeriodEnd ? (
            <p className="billing-notice">
              This membership will not renew. You keep every member benefit until{' '}
              {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'the period ends'}.
            </p>
          ) : null}
        </CardBody>
        <CardFooter>
          <div className="cluster">
            {manageUrl ? (
              <Button as="a" href={manageUrl} variant="secondary">
                Manage billing
              </Button>
            ) : null}
            {!subscription.cancelAtPeriodEnd && subscription.status !== 'canceled' ? (
              <Button
                variant="danger"
                onClick={() => {
                  setCancelError('');
                  setConfirmOpen(true);
                }}
              >
                Cancel membership
              </Button>
            ) : (
              <Button href="/pricing" variant="primary">
                Rejoin Inner Circle
              </Button>
            )}
            <Button variant="ghost" onClick={load} loading={manageLoading}>
              Refresh
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardBody>
          <h2>Need something else?</h2>
          <p>
            Order history and shipping addresses live in your account. For refunds or sizing swaps,
            email support and we will sort it within one business day.
          </p>
          <div className="cluster">
            <Button href="/account" variant="secondary">
              Account
            </Button>
            <Button href="/shop" variant="ghost">
              Continue shopping
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!canceling) setConfirmOpen(false);
        }}
        title="Cancel your membership?"
        footer={
          <div className="cluster">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={canceling}
            >
              Keep membership
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={canceling}>
              Yes, cancel
            </Button>
          </div>
        }
      >
        <p>
          You will keep early access, free shipping and member pricing until{' '}
          {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'the end of the period'}.
          After that the membership will not renew.
        </p>
        {cancelError ? <p className="form-error">{cancelError}</p> : null}
      </Modal>
    </section>
  );
}