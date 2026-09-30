export default function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  tone = 'neutral',
  className = '',
}) {
  const classes = ['empty-state', `empty-state--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="empty-state__mark" aria-hidden="true">
        {tone === 'error' ? (
          <svg viewBox="0 0 48 48" width="48" height="48" focusable="false">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M24 14v14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="24" cy="34" r="1.8" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 48 48" width="48" height="48" focusable="false">
            <rect
              x="7"
              y="13"
              width="34"
              height="26"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M7 21h34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M18 9h12l3 4H15z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M19 30h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>

      <h3 className="empty-state__title">{title}</h3>

      {description ? (
        <p className="empty-state__description">{description}</p>
      ) : null}

      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}