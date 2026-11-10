"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/app/actions";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@/lib/constants";
import { calendarDays, workingDays } from "@/lib/leave-dates";
import { Button } from "./ui/Button";
import { ErrorMessage, Label, HelpText, checkboxClass, fieldClass } from "./ui/Field";

export type LeaveFormValues = {
  leaveType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  hasCertificate: boolean;
  certificateNote: string;
};

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Create/edit form used on the employee screens (Part B2 §13). Shows the
// live "Days: X (calendar) / Y (working)" line and the certificate tick
// that only appears for Sick leave.
export function LeaveForm({
  action,
  initial,
  submitLabel = "Save as draft",
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initial?: LeaveFormValues;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [leaveType, setLeaveType] = useState(initial?.leaveType ?? "ANNUAL");
  const [start, setStart] = useState(initial?.startDate ?? "");
  const [end, setEnd] = useState(initial?.endDate ?? "");

  const valid = start !== "" && end !== "" && end >= start;
  const cal = valid ? calendarDays(day(start), day(end)) : 0;
  const wd = valid ? workingDays(day(start), day(end)) : 0;

  return (
    <form action={formAction} className="space-y-5">
      <ErrorMessage message={state.error} />

      <div>
        <Label htmlFor="leaveType">Leave type</Label>
        <select
          id="leaveType"
          name="leaveType"
          className={fieldClass()}
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
        >
          {LEAVE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LEAVE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className={fieldClass()}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            className={fieldClass()}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      {valid ? (
        <HelpText>
          Days: {cal} (calendar) / {wd} (working). Weekends and public holidays
          count toward the length but not against your balance.
        </HelpText>
      ) : start !== "" && end !== "" ? (
        <ErrorMessage message="The end date must be on or after the start date." />
      ) : null}

      {leaveType === "SICK" ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="hasCertificate"
              value="yes"
              defaultChecked={initial?.hasCertificate}
              className={checkboxClass}
            />
            I have a doctor&apos;s certificate
          </label>
          <div>
            <Label htmlFor="certificateNote">Certificate note</Label>
            <input
              id="certificateNote"
              name="certificateNote"
              type="text"
              maxLength={200}
              placeholder="e.g. Clinic name and reference"
              className={fieldClass()}
              defaultValue={initial?.certificateNote ?? ""}
            />
            <HelpText>Required when the sick leave is over 2 days.</HelpText>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending || !valid}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
