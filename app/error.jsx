'use client';

import { useEffect } from 'react';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (error) {
      // Surface the failure in the browser console for debugging.
      console.error('Storefront error boundary caught:', error);
    }
  }, [error]);

  const detail =
    error && typeof error.message === 'string' && error.message.trim().length > 0
      ? error.message
      : 'Something interrupted this page while it was loading.';

  return (
    <section className="stack">
      <EmptyState
        tone="error"
        title="This page hit a snag"
        description={`${detail} The rest of the store is still online — try again, or head back to the shop.`}
        action={
          <div className="cluster">
            <Button variant="primary" size="md" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="secondary" size="md" href="/shop">
              Back to shop
            </Button>
          </div>
        }
      />
    </section>
  );
}