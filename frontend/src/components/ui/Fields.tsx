import { useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { useTranslation } from '../../context/language-context';

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

export const InputField = ({ label, hint, error, className = '', type, onChange, multiple, ...props }: InputFieldProps) => {
  const { t } = useTranslation();
  const [selectedFilesLabel, setSelectedFilesLabel] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    setSelectedFilesLabel(files.map((file) => file.name).join(', '));
    onChange?.(event);
  };

  if (type === 'file') {
    return (
      <FieldShell label={label} hint={hint} error={error}>
        <span className="field__file-picker">
          <span className="field__file-action">{t('common.chooseFile')}</span>
          <span className={`field__file-name ${selectedFilesLabel ? '' : 'field__file-name--empty'}`.trim()}>
            {selectedFilesLabel || t('common.noFileChosen')}
          </span>
          <input
            className={`input input--file-native ${className}`.trim()}
            type="file"
            multiple={multiple}
            onChange={handleFileChange}
            {...props}
          />
        </span>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={label} hint={hint} error={error}>
      <input className={`input ${className}`.trim()} type={type} onChange={onChange} {...props} />
    </FieldShell>
  );
};

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
