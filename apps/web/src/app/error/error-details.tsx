"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass } from "@/components/auth/button-styles";
import { Notice } from "@/components/auth/notice";

export type ErrorVariant = { title: string; message: string };

// Supabase reports rejected email links (expired, already used) in the URL fragment,
// e.g. #error=access_denied&error_code=otp_expired — invisible to the server.
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHashErrorCode(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get("error_code");
}

export function ErrorDetails({
  variants,
  initialReason,
  backToLogin,
  requestNewLink,
}: {
  variants: Record<string, ErrorVariant>;
  initialReason: string;
  backToLogin: string;
  requestNewLink: string;
}) {
  const hashErrorCode = useSyncExternalStore(subscribeToHash, readHashErrorCode, () => null);
  const reason = hashErrorCode ? "link_expired" : initialReason;
  const { title, message } = variants[reason];
  const isLinkProblem = reason !== "generic";

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="error">
        <p className="font-medium">{title}</p>
        <p className="mt-1">{message}</p>
      </Notice>
      {isLinkProblem && (
        <Link href="/forgot-password" className={`${secondaryButtonClass} text-center`}>
          {requestNewLink}
        </Link>
      )}
      <Link href="/login" className={`${primaryButtonClass} text-center`}>
        {backToLogin}
      </Link>
    </div>
  );
}
