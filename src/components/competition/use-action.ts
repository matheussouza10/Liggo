"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/competition/actions";

/** Runs a server action, keeps the pending state and the error text. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const result = await fn();
      if (result.ok) onOk?.();
      else setError(result.error);
    });
  };
  return { pending, error, setError, run };
}
