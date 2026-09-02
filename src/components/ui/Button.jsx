import React from 'react';
import { Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../services/feedbackService';

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-200 dark:shadow-none border border-indigo-500/20',
  secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60',
  success: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-200 dark:shadow-none border border-emerald-500/20',
  danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-200 dark:shadow-none border border-rose-500/20',
  outline: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-transparent'
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[34px] gap-1.5 font-medium',
  md: 'px-4 py-2 text-sm rounded-xl min-h-[42px] gap-2 font-semibold',
  lg: 'px-5 py-2.5 text-base rounded-xl min-h-[48px] gap-2.5 font-semibold'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...rest
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    try {
      triggerHaptic('light');
    } catch {}
    if (onClick) onClick(e);
  };

  const baseStyle = 'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0 text-current" />
      ) : null}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' ? (
        <Icon className="w-4 h-4 shrink-0 text-current" />
      ) : null}
    </button>
  );
}
