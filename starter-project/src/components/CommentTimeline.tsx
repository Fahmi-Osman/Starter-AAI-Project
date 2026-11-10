import { formatTimestamp } from "@/lib/constants";
import { Avatar } from "./ui/Avatar";

// The comment record of a request (Part A2 §9: comments are permanent).
export function CommentTimeline({
  comments,
}: {
  comments: { id: number; body: string; createdAt: Date; author: { name: string } }[];
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-slate-400">No comments yet.</p>;
  }
  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <Avatar name={c.author.name} size="sm" />
          <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">
              {c.author.name} · {formatTimestamp(c.createdAt)}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
