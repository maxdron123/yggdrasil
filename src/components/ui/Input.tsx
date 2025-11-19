/**
 * Input Component
 *
 * Reusable text input with label and error handling
 */

import { InputHTMLAttributes, forwardRef, useId } from "react";
import { clsx } from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "block w-full rounded-lg border px-3 py-2 text-sm",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
            {
              "border-gray-300 focus:border-blue-500 focus:ring-blue-500":
                !error,
              "border-red-500 focus:border-red-500 focus:ring-red-500": error,
            },
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
