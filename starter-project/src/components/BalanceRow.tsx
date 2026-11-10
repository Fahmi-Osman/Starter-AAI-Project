"use client";

import { useActionState } from "react";
import { setBalance } from "@/app/actions";
import { BALANCED_LEAVE_TYPES, LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/constants";
import { Button } from "./ui/Button";
import { ErrorMessage, inputClass } from "./ui/Field";

// One editable row on /admin/balances (Part B2 §13): allowed days per
// limited type, saved with one button. Unpaid is unlimited — no box.
export function BalanceRow({
  userId,
  name,
  allowed,
}: {
  userId: number;
  name: string;
  allowed: Record<string, number | null>;
}) {
  const [state, formAction, pending] = useActionState(setBalance.bind(null, userId), {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="w-44 shrink-0 font-medium text-slate-900">{name}</span>
      {BALANCED_LEAVE_TYPES.map((t) => (
        <label key={t} className="flex items-center gap-2 text-sm text-slate-600">
          {LEAVE_TYPE_LABELS[t as LeaveType]}
          <input
            name={`days-${t}`}
            type="number"
            min={0}
            max={365}
            step={1}
            defaultValue={allowed[t] ?? ""}
            className={`${inputClass} w-20`}
            aria-label={`${LEAVE_TYPE_LABELS[t as LeaveType]} allowed days for ${name}`}
          />
        </label>
      ))}
      <span className="text-sm text-slate-400">Unpaid: Unlimited</span>
      <Button type="submit" variant="secondary" disabled={pending} className="ml-auto">
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error && (
        <div className="w-full">
          <ErrorMessage message={state.error} />
        </div>
      )}
    </form>
  );
}
