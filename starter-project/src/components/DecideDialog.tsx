"use client";

import { useEffect, useState, useActionState } from "react";
import type { ActionResult } from "@/app/actions";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { ErrorMessage, Label, fieldClass } from "./ui/Field";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

// The decide buttons on a supervisor's or HR's screen (Part B2 §13).
// Reject and Send back open a dialog whose comment box must be filled —
// the server insists too (Part A2 rule 8).
export function DecideDialog({
  canApprove,
  canReject,
  canSendBack,
  approveAction,
  rejectAction,
  sendBackAction,
}: {
  canApprove: boolean;
  canReject: boolean;
  canSendBack: boolean;
  approveAction: FormAction;
  rejectAction: FormAction;
  sendBackAction?: FormAction;
}) {
  const [dialog, setDialog] = useState<null | "reject" | "sendback">(null);
  const [approveState, approveForm, approving] = useActionState(approveAction, {});
  const [rejectState, rejectForm, rejecting] = useActionState(rejectAction, {});
  const fallback = (_p: ActionResult, _f: FormData): Promise<ActionResult> =>
    Promise.resolve({ error: "This action is not available." });
  const [sendState, sendForm, sending] = useActionState(sendBackAction ?? fallback, {});

  // Close the dialog once the server accepts the decision.
  useEffect(() => {
    if (dialog === "reject" && rejectState.ok) setDialog(null);
    if (dialog === "sendback" && sendState.ok) setDialog(null);
  }, [dialog, rejectState.ok, sendState.ok]);

  if (!canApprove && !canReject && !canSendBack) return null;

  return (
    <div className="mt-6 space-y-3">
      <ErrorMessage message={approveState.error} />
      <div className="flex flex-wrap gap-3">
        {canApprove && (
          <form action={approveForm}>
            <Button type="submit" variant="success" disabled={approving}>
              {approving ? "Approving…" : "Approve"}
            </Button>
          </form>
        )}
        {canReject && (
          <Button variant="danger" onClick={() => setDialog("reject")}>
            Reject
          </Button>
        )}
        {canSendBack && (
          <Button variant="secondary" onClick={() => setDialog("sendback")}>
            Send back for revision
          </Button>
        )}
      </div>

      <Modal open={dialog !== null} onClose={() => setDialog(null)}>
        <h2 className="text-lg font-semibold text-slate-900">
          {dialog === "reject" ? "Reject this request" : "Send back for revision"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {dialog === "reject"
            ? "The employee will see your reason next to the Rejected status."
            : "Say what needs changing — the employee sees it and can edit the request."}
        </p>
        <form
          action={dialog === "reject" ? rejectForm : sendForm}
          className="mt-4 space-y-4"
        >
          <ErrorMessage message={dialog === "reject" ? rejectState.error : sendState.error} />
          <div>
            <Label htmlFor="comment">Comment (required)</Label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              required
              maxLength={500}
              className={fieldClass()}
              placeholder={
                dialog === "reject"
                  ? "Why is this request rejected?"
                  : "What should the employee change?"
              }
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={dialog === "reject" ? "danger" : "primary"}
              disabled={rejecting || sending}
            >
              {dialog === "reject" ? "Reject request" : "Send back"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
