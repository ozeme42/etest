import React from 'react';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800/50',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
};

const SIZES = {
  xs: 'px-2 py-0.5 text-[11px] gap-1 font-medium',
  sm: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
  md: 'px-3 py-1.5 text-sm gap-2 font-semibold'
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  className = ''
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.default;
  const sizeStyle = SIZES[size] || SIZES.sm;

  return (
    <span className={`inline-flex items-center rounded-full border leading-none transition-colors ${variantStyle} ${sizeStyle} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
