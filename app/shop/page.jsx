'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ShopFilters from '../../components/ShopFilters';
import ProductGrid from '../../components/ProductGrid';
import { getProducts, getCategories } from '../../lib/api';
import { pluralize } from '../../lib/format';

const FALLBACK_CATEGORIES = [
  { value: 'all', label: 'All pieces' },
  { value: 'tees', label: 'Tees' },
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'accessories', label: 'Accessories' },
];

const CATEGORY_LABELS = {
  tees: 'Tees',
  hoodies: 'Hoodies',
  outerwear: 'Outerwear',
  bottoms: 'Bottoms',
  accessories: 'Accessories',
};

function labelFor(value) {
  if (!value) return 'Other';
  if (CATEGORY_LABELS[value]) return CATEGORY_LABELS[value];
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data && Array.isArray(data.categories) ? data.categories : [];
        if (!rows.length) return;
        const mapped = rows
          .map((row) => {
            const value = typeof row === 'string' ? row : row.category || row.value;
            if (!value) return null;
            const count = typeof row === 'object' && row !== null ? row.count : undefined;
            return { value, label: labelFor(value), count };
          })
          .filter(Boolean);
        if (mapped.length) {
          setCategories([{ value: 'all', label: 'All pieces' }, ...mapped]);
        }
      } catch {
        // Category list is an enhancement only — keep the sensible fallback.
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const params = { sort, limit: 60 };
        if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
        if (debouncedQuery) params.q = debouncedQuery;

        const data = await getProducts(params, { signal: controller.signal });
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data && Array.isArray(data.products) ? data.products : [];
        setProducts(rows);
      } catch (err) {
        if (cancelled || (err && err.name === 'AbortError')) return;
        setProducts([]);
        setError(
          (err && err.message) ||
            'We could not load the catalogue right now. Check your connection and try again.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeCategory, sort, debouncedQuery, reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const resultLine = useMemo(() => {
    if (loading) return 'Loading the rail…';
    if (error) return 'Catalogue unavailable';
    const count = products.length;
    const base = `${count} ${pluralize(count, 'piece')}`;
    const scope =
      activeCategory && activeCategory !== 'all'
        ? ` in ${labelFor(activeCategory)}`
        : '';
    const search = debouncedQuery ? ` matching “${debouncedQuery}”` : '';
    return `${base}${scope}${search}`;
  }, [loading, error, products.length, activeCategory, debouncedQuery]);

  return (
    <section className="page page--shop stack">
      <header className="page-head">
        <h1>Shop the full rail</h1>
        <p>
          Every piece in the MONOLITH line — heavyweight cottons, boxed silhouettes and platinum
          hardware, cut in small runs and restocked only when the drop calendar allows.
        </p>
      </header>

      <ShopFilters
        categories={categories}
        active={activeCategory}
        onChange={setActiveCategory}
        sort={sort}
        onSortChange={setSort}
        query={query}
        onQueryChange={setQuery}
      />

      <p className="results-count" aria-live="polite">
        {resultLine}
      </p>

      <ProductGrid products={products} loading={loading} error={error} onRetry={retry} />
    </section>
  );
}