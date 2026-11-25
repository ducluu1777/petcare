import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserListItem } from "@/hooks/use-users";

interface UserProfileSummaryProps {
  user: UserListItem;
}

export function UserProfileSummary({ user }: UserProfileSummaryProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
      <Avatar className="size-14 shrink-0 border border-slate-300">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
        <AvatarFallback className="font-bold text-primary">
          {user.name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "K"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-base font-bold text-ink">{user.name}</h4>
        <div className="mt-0.5 text-xs text-muted-text">{user.email || "Chưa có email"}</div>
        <div className="mt-1 text-xs font-semibold tabular-nums text-primary">
          {user.phone || "Chưa cập nhật số điện thoại"}
        </div>
      </div>
    </div>
  );
}
