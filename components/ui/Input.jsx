'use client';

import { useId } from 'react';

function describedBy(hintId, errorId, error, hint) {
  const ids = [];
  if (hint) ids.push(hintId);
  if (error) ids.push(errorId);
  return ids.length ? ids.join(' ') : undefined;
}

export default function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  className,
  ...rest
}) {
  const reactId = useId();
  const inputId = id || `field-${reactId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={className ? `field ${className}` : 'field'}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              {' *'}
            </span>
          ) : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={error ? 'field__control field__control--invalid' : 'field__control'}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(hintId, errorId, error, hint)}
        {...rest}
      />
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  rows = 4,
  className,
  ...rest
}) {
  const reactId = useId();
  const inputId = id || `textarea-${reactId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={className ? `field ${className}` : 'field'}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              {' *'}
            </span>
          ) : null}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={
          error
            ? 'field__control field__control--textarea field__control--invalid'
            : 'field__control field__control--textarea'
        }
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(hintId, errorId, error, hint)}
        {...rest}
      />
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  error,
  hint,
  required = false,
  placeholder,
  className,
  children,
  ...rest
}) {
  const reactId = useId();
  const inputId = id || `select-${reactId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={className ? `field ${className}` : 'field'}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              {' *'}
            </span>
          ) : null}
        </label>
      ) : null}
      <select
        id={inputId}
        className={
          error
            ? 'field__control field__control--select field__control--invalid'
            : 'field__control field__control--select'
        }
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(hintId, errorId, error, hint)}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => {
          const optValue = typeof option === 'string' ? option : option.value;
          const optLabel = typeof option === 'string' ? option : option.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
        {children}
      </select>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}