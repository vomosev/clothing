import Link from 'next/link';

const LINK_COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'All pieces', href: '/shop' },
      { label: 'New drops', href: '/shop?sort=newest' },
      { label: 'Hoodies', href: '/shop?category=hoodies' },
      { label: 'Accessories', href: '/shop?category=accessories' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Your account', href: '/account' },
      { label: 'Your bag', href: '/cart' },
      { label: 'Billing', href: '/billing' },
      { label: 'Sizing guide', href: '/shop' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Membership', href: '/pricing' },
      { label: 'Lookbook', href: '/lookbook' },
      { label: 'Stockists', href: '/shop' },
      { label: 'Contact', href: '/account' },
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <span className="site-footer__wordmark">MONOLITH</span>
            <p className="site-footer__copy">
              Streetwear cut in obsidian black and finished in platinum. Every drop is made in
              limited runs, pattern-tested on real bodies and shipped from our workshop within two
              working days.
            </p>
          </div>

          {LINK_COLUMNS.map((column) => (
            <nav
              key={column.heading}
              className="site-footer__column"
              aria-label={`${column.heading} links`}
            >
              <h3 className="site-footer__heading">{column.heading}</h3>
              <ul className="site-footer__links">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link className="site-footer__link" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="site-footer__note">
          Drop notifications go out to Inner Circle members 48 hours before public release. Join the
          membership on the pricing page to get on the list.
        </p>

        <div className="site-footer__bottom">
          <span className="site-footer__legal-note">
            &copy; {year} Monolith Supply Co. All rights reserved.
          </span>
          <ul className="site-footer__legal">
            <li>
              <Link className="site-footer__link" href="/shop">
                Shipping
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/shop">
                Returns
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/pricing">
                Terms
              </Link>
            </li>
            <li>
              <Link className="site-footer__link" href="/pricing">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}