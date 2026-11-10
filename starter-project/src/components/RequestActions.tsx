"use client";

import { useState, useActionState, useTransition } from "react";
import { cancelLeave, submitLeave } from "@/app/actions";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ErrorMessage } from "./ui/Field";

// The action buttons under an employee's request detail (Part B2 §13).
// Which buttons appear comes from the action table, computed on the server;
// the server re-checks everything anyway. Cancel asks first, like Log out.
export function RequestActions({
  requestId,
  canSubmit,
  canCancel,
}: {
  requestId: number;
  canSubmit: boolean;
  canCancel: boolean;
}) {
  const [submitState, submitAction, submitting] = useActionState(
    submitLeave.bind(null, requestId),
    {},
  );
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelLeave.bind(null, requestId),
    {},
  );
  const [askCancel, setAskCancel] = useState(false);
  // React requires the returned action to run inside a transition when it is
  // called outside a form submit (as the confirm dialog does).
  const [, startTransition] = useTransition();

  if (!canSubmit && !canCancel) return null;

  return (
    <div className="mt-6 space-y-4">
      {canSubmit && (
        <form action={submitAction} className="space-y-3">
          <ErrorMessage message={submitState.error} />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for approval"}
          </Button>
        </form>
      )}

      {canCancel && (
        <div>
          <ErrorMessage message={cancelState.error} />
          <Button
            variant="secondary"
            className="mt-3"
            disabled={cancelling}
            onClick={() => setAskCancel(true)}
          >
            {cancelling ? "Cancelling…" : "Cancel request"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={askCancel}
        title="Cancel this request?"
        message="It stays in your list as Cancelled — nothing is deleted."
        confirmLabel="Yes, cancel it"
        danger
        onCancel={() => setAskCancel(false)}
        onConfirm={() => {
          setAskCancel(false);
          startTransition(() => {
            cancelAction(new FormData());
          });
        }}
      />
    </div>
  );
}
