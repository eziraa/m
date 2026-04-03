"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, RefreshCw, LayoutGrid, Zap } from "lucide-react";

import { RoomDialog } from "@/components/room-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeleteRoomMutation, useGetRoomsForAgentQuery } from "@/lib/api";
import { Room } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function AgentRoomsPage() {
  const t = useTranslations("agent.rooms");
  const { data: rooms, isLoading, refetch } = useGetRoomsForAgentQuery();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedRoom(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!roomToDelete) return;

    try {
      await deleteRoom(roomToDelete).unwrap();
      toast.success(t("toast.deleted"));
      setRoomToDelete(null);
    } catch (err: any) {
      toast.error(err.data?.error || t("toast.deleteFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex justify-between gap-4 rounded-3xl border bg-card/90 p-4 shadow-sm flex-row items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Zap className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-11 w-11 rounded-2xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            onClick={handleCreate}
            className="min-h-[44px] rounded-2xl px-4"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("actions.newRoom")}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card
              key={index}
              className="h-[168px] rounded-3xl border bg-card/80 p-4"
            >
              <div className="flex h-full animate-pulse flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-16 w-16 rounded-[22px] bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-muted" />
                    <div className="h-10 w-10 rounded-2xl bg-muted" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-2/3 rounded-full bg-muted" />
                  <div className="h-7 w-24 rounded-full bg-muted" />
                </div>
              </div>
            </Card>
          ))
        ) : rooms?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center space-y-4 rounded-3xl border border-dashed bg-card/50 px-6 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
              <LayoutGrid className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                {t("empty.title")}
              </p>
              <p className="max-w-[260px] text-xs text-muted-foreground">
                {t("empty.subtitle")}
              </p>
            </div>
          </div>
        ) : (
          (rooms ?? []).map((room: Room) => (
            <Card
              key={room.id}
              className="rounded-3xl border bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={cn(
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-linear-to-br text-3xl shadow-lg ring-1 ring-black/5",
                      room.color || "from-blue-400 to-blue-600",
                    )}
                  >
                    {room.icon || "🎉"}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(room)}
                      className="h-10 w-10 rounded-2xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setRoomToDelete(room.id)}
                      className="h-10 w-10 rounded-2xl border-destructive/20 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-row gap-3">
                  <h2 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
                    {room.name}
                  </h2>
                  <Badge className="h-7 rounded-full border-blue-500/30 bg-blue-500/15 px-3 text-xs font-bold text-blue-500">
                    {room.price} ETB
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <RoomDialog
        room={selectedRoom}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      <AlertDialog
        open={!!roomToDelete}
        onOpenChange={() => setRoomToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              size="lg"
              onClick={() => setRoomToDelete(null)}
            >
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={"destructive"}
              size={"lg"}
              onClick={handleDelete}
            >
              {isDeleting ? t("actions.deleting") : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
