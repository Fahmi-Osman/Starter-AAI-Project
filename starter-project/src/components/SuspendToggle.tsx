"use client";

import { useState, useActionState } from "react";
import { setSuspended } from "@/app/actions";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ErrorMessage } from "./ui/Field";

// Suspend / Reactivate on /admin/users (Part B2 §13). Both ask first, like
// Cancel and Log out. Suspension blocks login; nothing is deleted (AC-26).
export function SuspendToggle({ userId, suspended }: { userId: number; suspended: boolean }) {
  const [ask, setAsk] = useState(false);
  const [state, action, pending] = useActionState(
    setSuspended.bind(null, userId, !suspended),
    {},
  );

  return (
    <div>
      <ErrorMessage message={state.error} />
      <Button
        variant={suspended ? "success" : "danger"}
        disabled={pending}
        onClick={() => setAsk(true)}
      >
        {pending ? "Working…" : suspended ? "Reactivate" : "Suspend"}
      </Button>
      <ConfirmDialog
        open={ask}
        title={suspended ? "Reactivate this account?" : "Suspend this account?"}
        message={
          suspended
            ? "The person can log in again. Their requests and balances are untouched."
            : "The person cannot log in any more, but their requests, comments and balances stay."
        }
        confirmLabel={suspended ? "Yes, reactivate" : "Yes, suspend"}
        danger={!suspended}
        onCancel={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false);
          void action(new FormData());
        }}
      />
    </div>
  );
}
