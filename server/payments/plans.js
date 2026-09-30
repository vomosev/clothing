module.exports = {
  plans: [
    {
      id: 'inner-circle-monthly',
      name: 'Inner Circle',
      description: 'Early access to every drop, free shipping and member pricing.',
      amount: 1200,
      interval: 'month',
      intervalCount: 1,
      features: [
        '48-hour early access to drops',
        'Free standard shipping',
        '10% member pricing',
        'Members-only colourways',
      ],
    },
    {
      id: 'inner-circle-yearly',
      name: 'Inner Circle Annual',
      description: 'Twelve months of Inner Circle with two months on us.',
      amount: 12000,
      interval: 'year',
      intervalCount: 1,
      features: [
        'Everything in Inner Circle',
        'Two months free',
        'Annual member tee',
      ],
    },
  ],
  products: [
    {
      id: 'starter-drop-bundle',
      name: 'Starter Drop Bundle',
      description: 'Two core tees and a cap from the current drop.',
      amount: 12500,
    },
    {
      id: 'gift-card-50',
      name: 'Gift Card $50',
      description: 'Digital gift card redeemable on any drop.',
      amount: 5000,
    },
    {
      id: 'gift-card-100',
      name: 'Gift Card $100',
      description: 'Digital gift card redeemable on any drop.',
      amount: 10000,
    },
  ],
};