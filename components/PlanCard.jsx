'use client';

import Card, { CardHeader, CardBody, CardFooter } from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { formatPrice, formatInterval } from '../lib/format';

export default function PlanCard({
  item,
  kind = 'plan',
  providers = [],
  onCheckout,
  busyProvider = null,
}) {
  if (!item) return null;

  const isPlan = kind === 'plan';
  const features = Array.isArray(item.features) ? item.features : [];
  const hasProviders = Array.isArray(providers) && providers.length > 0;

  const handleCheckout = (providerId) => {
    if (typeof onCheckout === 'function') {
      onCheckout(providerId, item, kind);
    }
  };

  return (
    <Card className="plan-card" raised={isPlan}>
      <CardHeader>
        <div className="plan-card__heading">
          <h3 className="plan-card__title">{item.name}</h3>
          <Badge tone={isPlan ? 'accent' : 'neutral'}>
            {isPlan ? 'Membership' : 'One-off'}
          </Badge>
        </div>
        <p className="plan-card__price price">
          <span className="price__amount">
            {formatPrice(item.amount, item.currency || 'USD')}
          </span>
          {isPlan ? (
            <span className="price__interval">
              {' '}
              {formatInterval(item.interval, item.intervalCount)}
            </span>
          ) : null}
        </p>
      </CardHeader>

      <CardBody>
        {item.description ? (
          <p className="plan-card__description">{item.description}</p>
        ) : null}

        {features.length > 0 ? (
          <ul className="plan-card__features">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}
      </CardBody>

      <CardFooter>
        {hasProviders ? (
          <div className="plan-card__actions cluster">
            {providers.map((provider, index) => (
              <Button
                key={provider.id}
                variant={index === 0 ? 'primary' : 'secondary'}
                size="md"
                loading={busyProvider === provider.id}
                disabled={Boolean(busyProvider) && busyProvider !== provider.id}
                onClick={() => handleCheckout(provider.id)}
              >
                {isPlan ? 'Subscribe with ' : 'Pay with '}
                {provider.label || provider.id}
                {provider.mode === 'test' ? ' (test)' : ''}
              </Button>
            ))}
          </div>
        ) : (
          <p className="plan-card__note">
            Payments are not available yet. Check back shortly — the checkout
            opens as soon as a provider is connected.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}