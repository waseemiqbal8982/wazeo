"use client";

import { WazeoSelect } from "./WazeoSelect";

interface SelectProps {
  label?: string;
  error?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  value: string;
  options: { value: string; label: string }[];
  onChange: (e: { target: { value: string } }) => void;
}

// Drop-in replacement for the native <select>: delegates to the theme-aware
// WazeoSelect (anchored dropdown on tablet/desktop, bottom sheet on phones).
export function Select({ label, error, options, className, id, placeholder, value, disabled, onChange }: SelectProps) {
  return (
    <WazeoSelect
      id={id}
      label={label}
      placeholder={placeholder}
      error={error}
      value={value}
      options={options}
      disabled={disabled}
      className={className}
      onChange={(v) => onChange({ target: { value: v } })}
    />
  );
}
