"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  pendingText?: string;
};

/**
 * Submit button that shows `pendingText` while its form is submitting. When a form has
 * several submit buttons (e.g. log in / sign up), give each a distinct `value` and only the
 * one that was clicked switches to its pending text.
 */
export function SubmitButton({ children, pendingText, name, value, ...props }: Props) {
  const { pending, data } = useFormStatus();

  const isPending = pending && (name === undefined || data?.get(name) === String(value));

  return (
    <button {...props} name={name} value={value} type="submit" disabled={pending}>
      {isPending ? pendingText : children}
    </button>
  );
}
