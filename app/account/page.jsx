'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getOrders } from '../../lib/api';
import Card, { CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatPrice, formatDate } from '../../lib/format';

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'paid' || value === 'fulfilled' || value === 'shipped') return 'success';
  if (value === 'pending' || value === 'processing') return 'warning';
  if (value === 'failed' || value === 'canceled' || value === 'cancelled') return 'danger';
  return 'neutral';
}

export default function AccountPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState('idle');
  const [ordersError, setOrdersError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/account');
    }
  }, [status, router]);

  const loadOrders = useCallback(async () => {
    setOrdersState('loading');
    setOrdersError('');
    try {
      const data = await getOrders();
      const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
      setOrders(list);
      setOrdersState('ready');
    } catch (err) {
      setOrdersError(err?.message || 'We could not load your order history.');
      setOrdersState('error');
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadOrders();
    }
  }, [status, loadOrders]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/');
    } catch (err) {
      setSigningOut(false);
    }
  }, [logout, router]);

  if (status === 'loading' || status === 'idle') {
    return (
      <section className="stack">
        <h1>Account</h1>
        <Card>
          <CardBody>
            <div className="state-panel">
              <Spinner size="md" label="Loading your account" />
              <p>Checking your session…</p>
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="stack">
        <h1>Account</h1>
        <EmptyState
          tone="error"
          title="We lost the connection"
          description="Your account details could not be loaded because the store API did not respond. Check your connection and try again."
          action={<Button onClick={() => window.location.reload()}>Try again</Button>}
        />
      </section>
    );
  }

  if (status === 'anonymous' || !user) {
    return (
      <section className="stack">
        <h1>Account</h1>
        <Card>
          <CardBody>
            <div className="state-panel">
              <Spinner size="md" label="Redirecting to sign in" />
              <p>Taking you to the sign-in page…</p>
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  const columns = [
    {
      key: 'reference',
      header: 'Order',
      render: (row) => <span className="order-item__name">{row.reference}</span>,
    },
    {
      key: 'created_at',
      header: 'Placed',
      render: (row) => formatDate(row.createdAt || row.created_at),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (row) => {
        const items = Array.isArray(row.items) ? row.items : [];
        const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        return count || items.length || '—';
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) =>
        formatPrice(
          Number(row.totalCents ?? row.total_cents ?? 0),
          row.currency || 'USD'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status || 'unknown'}</Badge>,
    },
  ];

  return (
    <section className="stack">
      <h1>Your account</h1>
      <p>
        Manage your profile, review past drops you have picked up and keep your Inner Circle
        membership in order.
      </p>

      <Card>
        <CardHeader>
          <h2>Profile</h2>
        </CardHeader>
        <CardBody>
          <dl className="detail-list">
            <div className="detail-list__row">
              <dt>Name</dt>
              <dd className="order-item__name">{user.full_name || user.fullName || 'Not provided'}</dd>
            </div>
            <div className="detail-list__row">
              <dt>Email</dt>
              <dd className="order-item__name">{user.email}</dd>
            </div>
            <div className="detail-list__row">
              <dt>Member since</dt>
              <dd>{formatDate(user.createdAt || user.created_at) || 'Today'}</dd>
            </div>
          </dl>
        </CardBody>
        <CardFooter>
          <div className="cluster">
            <Button href="/billing" variant="secondary" size="md">
              Membership &amp; billing
            </Button>
            <Button href="/pricing" variant="ghost" size="md">
              View plans
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleSignOut}
              loading={signingOut}
              disabled={signingOut}
            >
              Sign out
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <h2>Order history</h2>
        </CardHeader>
        <CardBody>
          {ordersState === 'loading' ? (
            <div className="skeleton-stack">
              <div className="skeleton skeleton--row" />
              <div className="skeleton skeleton--row" />
              <div className="skeleton skeleton--row" />
            </div>
          ) : null}

          {ordersState === 'error' ? (
            <EmptyState
              tone="error"
              title="Order history unavailable"
              description={ordersError}
              action={
                <Button onClick={loadOrders} size="md">
                  Retry
                </Button>
              }
            />
          ) : null}

          {ordersState === 'ready' && orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Once you secure a piece from a drop it will appear here with its tracking status."
              action={
                <Button href="/shop" size="md">
                  Browse the shop
                </Button>
              }
            />
          ) : null}

          {ordersState === 'ready' && orders.length > 0 ? (
            <Table
              columns={columns}
              rows={orders}
              getRowKey={(row) => row.reference || row.id}
              emptyMessage="No orders yet."
            />
          ) : null}
        </CardBody>
      </Card>
    </section>
  );
}