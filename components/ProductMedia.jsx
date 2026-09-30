'use client';

import React from 'react';

/**
 * Deterministic, local-only product artwork.
 *
 * Every product gets a stable inline SVG built from its image_key: a black /
 * platinum gradient field, a subtle diagonal weave and the product initials.
 * No external or hotlinked image URLs are ever used, so nothing can 404 and
 * nothing reflows once the page has painted.
 */

const PALETTES = [
  { from: '#0A0A0B', to: '#25262A', ink: '#E6E7EA', glow: '#9BA1A9' },
  { from: '#101114', to: '#33353B', ink: '#F1F2F4', glow: '#B7BCC4' },
  { from: '#08090A', to: '#1C1D21', ink: '#D8DADF', glow: '#8A9099' },
  { from: '#131418', to: '#3A3D44', ink: '#EDEEF1', glow: '#C2C7CE' },
  { from: '#0B0C0E', to: '#2B2D33', ink: '#DFE1E6', glow: '#A4AAB3' },
  { from: '#0E0F12', to: '#42454D', ink: '#F4F5F7', glow: '#CCD1D8' },
];

function hashString(value) {
  const input = String(value == null ? '' : value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function initialsFrom(name, imageKey) {
  const source = String(name || imageKey || 'Monolith')
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .trim();

  if (!source) return 'MN';

  const words = source.split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return 'MN';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function ProductMedia({ imageKey, name, priority = false }) {
  const seedSource = imageKey || name || 'monolith';
  const seed = hashString(seedSource);
  const palette = PALETTES[seed % PALETTES.length];
  const initials = initialsFrom(name, imageKey);

  // Deterministic geometry so the artwork is stable across renders/servers.
  const angle = 15 + (seed % 7) * 9;
  const arcOffset = 18 + (seed % 5) * 11;
  const stripeGap = 26 + (seed % 4) * 8;
  const uid = `pm-${seed.toString(36)}`;

  const label = name ? `${name} — product artwork` : 'Product artwork';

  return (
    <div className="product-media" data-priority={priority ? 'true' : 'false'}>
      <svg
        className="product-media__svg"
        viewBox="0 0 400 500"
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0" />
            <stop offset="55%" stopColor={palette.glow} stopOpacity="0.28" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </linearGradient>
          <pattern
            id={`${uid}-weave`}
            width={stripeGap}
            height={stripeGap}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${angle})`}
          >
            <rect width={stripeGap} height={stripeGap} fill="none" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={stripeGap}
              stroke={palette.glow}
              strokeOpacity="0.16"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width="400" height="500" fill={`url(#${uid}-bg)`} />
        <rect width="400" height="500" fill={`url(#${uid}-weave)`} />
        <rect width="400" height="500" fill={`url(#${uid}-sheen)`} />

        <circle
          cx={200 + arcOffset}
          cy={250 - arcOffset}
          r="150"
          fill="none"
          stroke={palette.glow}
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />
        <circle
          cx={200 - arcOffset}
          cy={250 + arcOffset}
          r="108"
          fill="none"
          stroke={palette.glow}
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />

        <text
          x="200"
          y="268"
          textAnchor="middle"
          fill={palette.ink}
          fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
          fontSize="112"
          fontWeight="700"
          letterSpacing="-4"
        >
          {initials}
        </text>

        <text
          x="200"
          y="330"
          textAnchor="middle"
          fill={palette.glow}
          fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
          fontSize="18"
          fontWeight="500"
          letterSpacing="8"
        >
          MONOLITH
        </text>
      </svg>
    </div>
  );
}