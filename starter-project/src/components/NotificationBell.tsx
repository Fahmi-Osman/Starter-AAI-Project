"use client";

import { useState } from "react";
import { markNotificationRead } from "@/app/actions";
import { BellIcon } from "./ui/Icons";

// The bell in the top bar (U12): unread count, dropdown newest first, and a
// click that marks the notification read and opens the request behind it
// (AC-23). The list comes from the server already scoped to this user.
export type BellItem = {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
  href: string;
};

export function NotificationBell({ items }: { items: BellItem[] }) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notifications
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  <form action={markNotificationRead.bind(null, n.id, n.href)}>
                    <button
                      type="submit"
                      className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                        n.read ? "text-slate-500" : "font-medium text-slate-900"
                      }`}
                    >
                      {n.message}
                      <span className="mt-0.5 block text-xs text-slate-400">{n.createdAt}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
