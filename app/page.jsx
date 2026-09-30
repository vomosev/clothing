'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProducts } from '../lib/api';
import ProductGrid from '../components/ProductGrid';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';

const VALUE_POINTS = [
  {
    title: 'Cut in small runs',
    body: 'Every drop is capped at 300 pieces per colourway. When it is gone, it does not come back.',
  },
  {
    title: 'Heavyweight by default',
    body: '240gsm cotton on tees, 480gsm loopback fleece on hoodies. Garment washed so the fit stays honest.',
  },
  {
    title: 'Shipped in 48 hours',
    body: 'Orders leave the Leeds studio within two working days, with free returns for thirty days.',
  },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts({ featured: true, limit: 8 }, { signal });
      const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'We could not load the featured drop.');
      setProducts([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => {
      controller.abort();
    };
  }, [load]);

  return (
    <div className="stack">
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__eyebrow">Drop 07 — Platinum Static</p>
        <h1 id="hero-title" className="hero__title">
          Streetwear built in black. Finished in platinum.
        </h1>
        <p className="hero__lede">
          MONOLITH makes heavyweight staples for people who wear the same silhouette every day and
          want it to hold its shape. Boxy tees, brushed fleece, cargo cuts — no logos louder than the
          garment.
        </p>
        <div className="cluster hero__actions">
          <Button href="/shop" size="lg" variant="primary">
            Shop the drop
          </Button>
          <Button href="/pricing" size="lg" variant="secondary">
            Join Inner Circle
          </Button>
        </div>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <div className="section__head cluster">
          <h2 id="featured-title">Featured this week</h2>
          <Button href="/shop" variant="ghost" size="sm">
            View all
          </Button>
        </div>
        <ProductGrid products={products} loading={loading} error={error} onRetry={load} />
      </section>

      <section className="section" aria-labelledby="values-title">
        <h2 id="values-title">Why it lasts</h2>
        <div className="grid grid--3">
          {VALUE_POINTS.map((point) => (
            <Card key={point.title} raised>
              <CardBody>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="membership-title">
        <Card raised className="membership-teaser">
          <CardBody>
            <h2 id="membership-title">Inner Circle members get first pick</h2>
            <p>
              Twelve dollars a month buys you a 48-hour head start on every release, free standard
              shipping, ten percent off the full catalogue and access to members-only colourways.
              Cancel whenever you like.
            </p>
            <div className="cluster">
              <Button href="/pricing" variant="primary" size="md">
                See membership plans
              </Button>
              <Button href="/billing" variant="ghost" size="md">
                Manage billing
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}