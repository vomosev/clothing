'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Card, {
  CardHeader,
  CardBody,
  CardFooter,
} from '../../components/ui/Card';
import Field from '../../components/ui/Input';

const DEFAULT_NEXT_PATH = '/account';

function getSafeNextPath(value) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    decodeURI(value);

    const baseUrl = new URL('https://app.invalid');
    const url = new URL(value, baseUrl);

    if (url.origin !== baseUrl.origin) {
      return DEFAULT_NEXT_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeNextPath(searchParams.get('next'));
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        fullName: trimmedName,
        email: normalizedEmail,
        password,
      });

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isDuplicate =
        err?.status === 409 || /already|exists|duplicate/i.test(message);
      const isNetworkError = err?.status === 0;

      if (isDuplicate) {
        setError(message || 'An account with this email already exists.');
      } else if (isNetworkError) {
        setError('Unable to connect. Please check your connection and try again.');
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <Card className="auth-card">
        <CardHeader>
          <h1 className="auth-title">Create an account</h1>
        </CardHeader>

        <CardBody>
          {error && (
            <div className="form__error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <Field
              id="name"
              name="name"
              type="text"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />

            <Field
              id="email"
              name="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            <Button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
        </CardBody>

        <CardFooter>
          <p className="auth-card__foot">
            Already have an account?{' '}
            <Link
              href={`/login?next=${encodeURIComponent(redirectTo)}`}
              className="auth-link"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="auth-page">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
