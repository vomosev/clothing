'use client';

import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';

export default function BillingCancelPage() {
  return (
    <section className="stack">
      <h1>Payment cancelled</h1>
      <EmptyState
        tone="neutral"
        title="Your payment was cancelled"
        description="No charge was made and nothing has left your account. Your bag is still waiting, and any membership you were signing up for has not started."
        action={
          <div className="cluster">
            <Button href="/pricing" variant="primary" size="md">
              Back to pricing
            </Button>
            <Button href="/cart" variant="secondary" size="md">
              Review your bag
            </Button>
            <Button href="/shop" variant="ghost" size="md">
              Keep shopping
            </Button>
          </div>
        }
      />
      <p>
        If you ran into trouble at the payment step, try a different provider on
        the pricing page or contact the MONOLITH support team and we will sort it
        out.
      </p>
    </section>
  );
}