"use client";

import { useActionState } from "react";
import { submitLeave } from "@/app/actions";
import { Button } from "./ui/Button";
import { ErrorMessage } from "./ui/Field";

// The action buttons under an employee's request detail (Part B2 §13).
// Which buttons appear comes from the action table, computed on the server;
// the server re-checks everything anyway.
export function RequestActions({
  requestId,
  canSubmit,
}: {
  requestId: number;
  canSubmit: boolean;
}) {
  const [submitState, submitAction, submitting] = useActionState(
    submitLeave.bind(null, requestId),
    {},
  );

  if (!canSubmit) return null;

  return (
    <form action={submitAction} className="mt-6 space-y-3">
      <ErrorMessage message={submitState.error} />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit for approval"}
      </Button>
    </form>
  );
}
