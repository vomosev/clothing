'use client';

import Button from './ui/Button';
import Field, { Select } from './ui/Input';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export default function ShopFilters({
  categories = [],
  active = 'all',
  onChange,
  sort = 'newest',
  onSortChange,
  query = '',
  onQueryChange,
}) {
  const safeCategories = Array.isArray(categories) ? categories : [];

  const options = [
    { value: 'all', label: 'All drops', count: null },
    ...safeCategories
      .filter((entry) => entry && (entry.category || typeof entry === 'string'))
      .map((entry) =>
        typeof entry === 'string'
          ? { value: entry, label: labelFor(entry), count: null }
          : {
              value: entry.category,
              label: labelFor(entry.category),
              count: typeof entry.count === 'number' ? entry.count : null,
            }
      ),
  ];

  const handleCategory = (value) => {
    if (typeof onChange === 'function') onChange(value);
  };

  return (
    <section className="shop-filters" aria-label="Filter the catalogue">
      <div className="shop-filters__categories" role="group" aria-label="Product categories">
        {options.map((option) => {
          const isActive = option.value === active;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={isActive ? 'primary' : 'ghost'}
              aria-pressed={isActive}
              onClick={() => handleCategory(option.value)}
            >
              {option.count === null ? option.label : `${option.label} (${option.count})`}
            </Button>
          );
        })}
      </div>

      <div className="shop-filters__controls">
        <Field
          id="shop-search"
          label="Search the catalogue"
          type="search"
          value={query}
          placeholder="Search tees, hoodies, cargos"
          onChange={(event) => {
            if (typeof onQueryChange === 'function') onQueryChange(event.target.value);
          }}
        />

        <Select
          id="shop-sort"
          label="Sort by"
          value={sort}
          onChange={(event) => {
            if (typeof onSortChange === 'function') onSortChange(event.target.value);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </section>
  );
}

function labelFor(value) {
  if (!value || typeof value !== 'string') return 'Other';
  const map = {
    tees: 'Tees',
    hoodies: 'Hoodies',
    outerwear: 'Outerwear',
    bottoms: 'Bottoms',
    accessories: 'Accessories',
  };
  if (map[value]) return map[value];
  return value.charAt(0).toUpperCase() + value.slice(1);
}