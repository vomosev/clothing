import './globals.css';
import { Inter } from 'next/font/google';
import SiteShell from '../components/SiteShell';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  fallback: [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
});

export const metadata = {
  metadataBase: new URL('https://clothing.arx-app.com'),
  title: 'MONOLITH — Streetwear',
  description:
    'MONOLITH is a black-and-platinum streetwear label: heavyweight tees, boxy hoodies and technical outerwear released in limited drops.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'MONOLITH — Streetwear',
    description:
      'Heavyweight tees, boxy hoodies and technical outerwear released in limited drops.',
    url: 'https://clothing.arx-app.com',
    siteName: 'MONOLITH',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="shell">
        <AuthProvider>
          <CartProvider>
            <SiteShell>{children}</SiteShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}