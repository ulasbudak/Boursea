import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary " +
  "placeholder:text-text-tertiary transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

/** Input with a leading icon (search fields, email/password on the login form). */
export function IconInput({
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
        {icon}
      </span>
      <input className={`${fieldBase} pl-9 ${className}`} {...props} />
    </div>
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldBase} ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-xs font-medium text-text-secondary ${className}`}
      {...props}
    />
  );
}

export function Field({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col ${className}`} {...props} />;
}
