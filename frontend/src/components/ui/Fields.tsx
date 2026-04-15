import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

const FieldShell = ({ label, hint, error, children }: FieldShellProps) => (
  <label className="field">
    {label ? <span className="field__label">{label}</span> : null}
    {children}
    {hint ? <span className="field__hint">{hint}</span> : null}
    {error ? <span className="field__error">{error}</span> : null}
  </label>
);

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const InputField = ({ label, hint, error, className = '', ...props }: InputFieldProps) => (
  <FieldShell label={label} hint={hint} error={error}>
    <input className={`input ${className}`.trim()} {...props} />
  </FieldShell>
);

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const SelectField = ({ label, hint, error, className = '', children, ...props }: SelectFieldProps) => (
  <FieldShell label={label} hint={hint} error={error}>
    <select className={`input ${className}`.trim()} {...props}>
      {children}
    </select>
  </FieldShell>
);

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextareaField = ({ label, hint, error, className = '', ...props }: TextareaFieldProps) => (
  <FieldShell label={label} hint={hint} error={error}>
    <textarea className={`input textarea ${className}`.trim()} {...props} />
  </FieldShell>
);
