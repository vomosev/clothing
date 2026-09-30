export default function Badge({ tone = 'neutral', className = '', children, ...rest }) {
  const tones = ['neutral', 'accent', 'success', 'warning', 'danger'];
  const safeTone = tones.includes(tone) ? tone : 'neutral';
  const classes = ['badge', `badge--${safeTone}`, className].filter(Boolean).join(' ');

  if (children === null || children === undefined || children === false || children === '') {
    return null;
  }

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}