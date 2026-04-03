"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, RefreshCw, LayoutGrid, Zap } from "lucide-react";
import {
  useDeleteRoomMutation,
  useToggleRoomBotsMutation,
  useGetRoomsForAgentQuery,
} from "@/lib/api";
import { Room } from "@/lib/types";
import { RoomDialog } from "@/components/room-dialog";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function AgentRoomsPage() {
  const t = useTranslations("agent.rooms");
  const router = useRouter();
  const { data: rooms, isLoading, refetch } = useGetRoomsForAgentQuery();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();
  const [toggleRoomBots] = useToggleRoomBotsMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [togglingRoomId, setTogglingRoomId] = useState<string | null>(null);

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

  const handleBotToggle = async (room: Room, allow: boolean) => {
    setTogglingRoomId(room.id);
    try {
      await toggleRoomBots({ id: room.id, botAllowed: allow }).unwrap();
      toast.success(
        allow ? "Anonymous bots enabled" : "Anonymous bots disabled",
      );
    } catch (err: any) {
      toast.error(err.data?.error || "Failed to update bot setting");
    } finally {
      setTogglingRoomId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex  gap-3 flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 ">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 w-9 rounded-lg"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button onClick={handleCreate} size="sm" className="rounded-lg">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("actions.newRoom")}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 w-full bg-muted rounded-xl animate-pulse border"
            />
          ))
        ) : rooms?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border">
              <LayoutGrid className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                {t("empty.title")}
              </p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                {t("empty.subtitle")}
              </p>
            </div>
          </div>
        ) : (
          rooms?.map((room: Room) => (
            <Card
              key={room.id}
              className="group relative border bg-card rounded-2xl overflow-hidden p-4 flex flex-col items-center text-center gap-3 transition-all "
            >
              {/* Actions Overlay */}
              <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(room)}
                  className="h-8 w-8 rounded-xl"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRoomToDelete(room.id)}
                  className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex w-full justify-between">
                <div
                  className={cn(
                    "h-16 w-16 shrink-0 rounded-2xl bg-linear-to-br shadow-xl flex items-center justify-center text-3xl mt-1",
                    room.color || "from-blue-400 to-blue-600",
                  )}
                >
                  {room.icon || "🎉"}
                </div>
                <div className="pt-4 w-full flex flex-col items-center gap-1.5">
                  <span className="text-sm font-black truncate w-full px-1 leading-tight">
                    {room.name}
                  </span>

                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] h-5 px-2.5 font-black uppercase tracking-wider">
                    {room.price} ETB
                  </Badge>
                </div>
              </div>

              {/* <div className="flex-1 w-full flex flex-col items-center gap-1.5">
                <span className="text-sm font-black truncate w-full px-1 leading-tight">
                  {room.name}
                </span>

                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] h-5 px-2.5 font-black uppercase tracking-wider">
                  {room.price} ETB
                </Badge> */}

              {/* <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 font-medium px-2">
                  {room.description || t("fallbackDescription")}
                </p> */}

              {/* <div className="flex items-center justify-center gap-2 mt-2 pt-3 border-t border-border/60 w-full">
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                    {t("playersShort", {
                      min: room.minPlayers ?? 0,
                      max: room.maxPlayers ?? 0,
                    })}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                    {t("status.active")}
                  </span>
                </div> */}

              {/* <div className="flex items-center justify-between w-full mt-3 px-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {room.botAllowed ? "Bots Enabled" : "Bots Disabled"}
                  </span>
                  <Switch
                    checked={Boolean(room.botAllowed)}
                    disabled={togglingRoomId === room.id}
                    onCheckedChange={(checked: boolean) =>
                      handleBotToggle(room, checked)
                    }
                  />
                </div> */}
              {/* </div> */}
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
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {isDeleting ? t("actions.deleting") : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
