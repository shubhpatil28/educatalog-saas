import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    loading?: boolean; // Added to prevent leak
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    loading, // Destructured here
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95',
        secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        outline: 'border border-slate-300 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
        ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-95',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg font-semibold',
        icon: 'p-2',
    };

    // Safely handle the loading attribute to prevent React warning
    // We only pass data-loading if isLoading is true
    const loadingProps = isLoading ? { 'data-loading': 'true' } : {};

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || disabled}
            {...loadingProps}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {children}
        </button>
    );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { loading?: boolean }> = ({ children, className, loading, ...props }) => {
    // Explicitly destructure 'loading' to prevent it from leaking to the div
    const loadingProps = loading ? { 'data-loading': 'true' } : {};
    return (
        <div
            className={cn('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm', className)}
            {...loadingProps}
            {...props}
        >
            {children}
        </div>
    );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; loading?: boolean }> = ({ label, error, className, loading, ...props }) => {
    // Explicitly destructure 'loading' to prevent it from leaking to the input
    const loadingProps = loading ? { 'data-loading': 'true' } : {};
    return (
        <div className="space-y-1.5 w-full">
            {label && <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{label}</label>}
            <input
                className={cn(
                    'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 placeholder:text-slate-400',
                    error && 'border-red-500 focus:ring-red-500',
                    className
                )}
                {...loadingProps}
                {...props}
            />
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    );
};

