export default function Spinner({ size = 'sm', label = 'Loading', className = '' }) {
  const allowed = ['sm', 'md', 'lg'];
  const resolved = allowed.includes(size) ? size : 'sm';
  const classes = ['spinner', `spinner--${resolved}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-live="polite">
      <svg className="spinner__ring" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle className="spinner__track" cx="16" cy="16" r="13" fill="none" strokeWidth="4" />
        <circle
          className="spinner__indicator"
          cx="16"
          cy="16"
          r="13"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}