"use client";

import { Post } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PostTableProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onSend: (post: Post) => void;
}

export function PostTable({ posts, onEdit, onDelete, onSend }: PostTableProps) {
  const t = useTranslations("admin.postTable");
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "sent":
        return t("status.sent");
      case "failed":
        return t("status.failed");
      case "scheduled":
        return t("status.scheduled");
      case "sending":
        return t("status.sending");
      case "draft":
        return t("status.draft");
      case "pending":
        return t("status.pending");
      default:
        return status.toUpperCase();
    }
  };
  if (posts.length === 0) {
    return (
      <Card className="bg-foreground/5 border-foreground/10 rounded-2xl p-4 text-sm text-foreground/60">
        {t("empty")}
      </Card>
    );
  }

  return (
    <Card className="bg-foreground/5 border-foreground/10 rounded-2xl overflow-hidden">
      <Table className="text-xs sm:text-sm">
        <TableHeader className="bg-foreground/5">
          <TableRow>
            <TableHead className="w-[40%]">{t("headers.title")}</TableHead>
            <TableHead>{t("headers.status")}</TableHead>
            <TableHead>{t("headers.scheduled")}</TableHead>
            <TableHead>{t("headers.updated")}</TableHead>
            <TableHead className="text-right">{t("headers.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id} className="hover:bg-foreground/5/80">
              <TableCell className="font-medium max-w-[180px] truncate">
                {post.title}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-2 py-0 text-[10px] font-semibold rounded-full border-foreground/20",
                    post.status === "sent" &&
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    post.status === "failed" &&
                      "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    post.status === "scheduled" &&
                      "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  )}
                >
                  {getStatusLabel(post.status)}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground/50">
                {post.scheduledAt
                  ? formatDistanceToNow(new Date(post.scheduledAt), {
                      addSuffix: true,
                    })
                  : t("dash")}
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground/50">
                {formatDistanceToNow(new Date(post.updatedAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onEdit(post)}
                >
                  {t("actions.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300"
                  onClick={() => onDelete(post)}
                >
                  {t("actions.delete")}
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => onSend(post)}
                >
                  {t("actions.send")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
