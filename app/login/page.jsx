'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Field from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardFooter, CardHeader } from '../../components/ui/Card';

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

function getSafeNextPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/account';
  }

  try {
    decodeURI(value);
    const url = new URL(value, 'https://monolith.local');
    if (url.origin !== 'https://monolith.local') {
      return '/account';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/account';
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();

  const nextParam = searchParams?.get('next') || '/account';
  const safeNext = getSafeNextPath(nextParam);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(safeNext);
    }
  }, [status, safeNext, router]);

  function validate() {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Enter the email address on your account.';
    } else if (!isEmail(email)) {
      errors.email = 'That email address does not look right.';
    }
    if (!password) {
      errors.password = 'Enter your password.';
    } else if (password.length < 8) {
      errors.password = 'Passwords are at least 8 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (pending) return;
    if (!validate()) return;

    setPending(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace(safeNext);
    } catch (err) {
      const status0 = err && typeof err.status === 'number' ? err.status : null;
      if (status0 === 0) {
        setFormError('We could not reach the store right now. Check your connection and try again.');
      } else if (status0 === 401) {
        setFormError('That email and password combination did not match an account.');
      } else {
        setFormError((err && err.message) || 'Something went wrong signing you in. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-page stack">
      <header className="auth-page__intro">
        <h1>Sign in</h1>
        <p>
          Welcome back. Sign in to track orders, keep your bag across devices and get first look at every
          MONOLITH drop.
        </p>
      </header>

      <Card className="auth-card" raised>
        <CardHeader>
          <h2 className="auth-card__title">Account access</h2>
        </CardHeader>
        <CardBody>
          <form className="form stack" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <p className="form__error" role="alert">
                {formError}
              </p>
            ) : null}

            <Field
              id="login-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldErrors.email}
              required
            />

            <Field
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              error={fieldErrors.password}
              hint="At least 8 characters."
              required
            />

            <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending}>
              {pending ? 'Signing in' : 'Sign in'}
            </Button>
          </form>
        </CardBody>
        <CardFooter>
          <p className="auth-card__aside">
            New to MONOLITH?{' '}
            <Link href={`/signup?next=${encodeURIComponent(safeNext)}`}>Create an account</Link> to check out
            faster.
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="auth-page stack">
          <h1>Sign in</h1>
          <div className="skeleton skeleton--panel" aria-hidden="true" />
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}