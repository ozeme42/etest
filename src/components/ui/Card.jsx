import React from 'react';

const PADDINGS = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8'
};

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  glass = false,
  padding = 'md',
  header,
  footer,
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  ...rest
}) {
  const isClickable = Boolean(onClick);
  const paddingClass = PADDINGS[padding] || PADDINGS.md;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl transition-all duration-200 border ${
        glass
          ? 'backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800/80 shadow-sm'
          : 'bg-white dark:bg-slate-900/85 border-slate-200/80 dark:border-slate-800 shadow-xs'
      } ${
        (hoverable || isClickable)
          ? 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:-translate-y-0.5 cursor-pointer'
          : ''
      } ${className}`}
      {...rest}
    >
      {(header || title || Icon || actions || badge) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          {header || (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  {title && (
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {badge}
                {actions}
              </div>
            </>
          )}
        </div>
      )}

      <div className={paddingClass}>
        {children}
      </div>

      {footer && (
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
}

