'use client';

import ProductCard from './ProductCard';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';

function SkeletonCard() {
  return (
    <div className="product-card product-card--skeleton" aria-hidden="true">
      <div className="skeleton skeleton--media" />
      <div className="product-card__body">
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing in this rack yet',
  emptyDescription = 'No pieces match the filters you picked. Clear a filter or browse the full catalogue to see what is currently in stock.',
  emptyAction = null,
  skeletonCount = 6,
}) {
  if (loading) {
    return (
      <div className="product-grid" role="status" aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={`product-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    const message =
      typeof error === 'string'
        ? error
        : error?.message || 'We could not load this drop right now. Check your connection and try again.';

    return (
      <EmptyState
        tone="error"
        title="We could not load these pieces"
        description={message}
        action={
          onRetry ? (
            <Button variant="primary" size="md" onClick={onRetry}>
              Try again
            </Button>
          ) : (
            <Button variant="secondary" size="md" href="/shop">
              Back to shop
            </Button>
          )
        }
      />
    );
  }

  const list = Array.isArray(products) ? products : [];

  if (list.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          emptyAction || (
            <Button variant="secondary" size="md" href="/shop">
              Browse all drops
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="product-grid">
      {list.map((product) => (
        <ProductCard key={product.id ?? product.slug} product={product} />
      ))}
    </div>
  );
}