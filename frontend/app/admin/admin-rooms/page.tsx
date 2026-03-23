"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  LayoutGrid,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useGetAdminRoomsQuery,
  useDeleteRoomMutation,
  type RoomItem,
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

export default function AdminRoomsPage() {
  const t = useTranslations("admin.rooms");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 12;
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetAdminRoomsQuery({
    page,
    pageSize,
    search: search || undefined,
  });
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const rooms = data?.rooms ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search]);

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
    <div className="bg-background min-h-svh h-screen max-h-screen overflow-y-auto custom-scrollbar transition-colors duration-500">
      <div className="w-full max-w-[430px] flex flex-col min-h-svh bg-[#0f111a] text-white relative overflow-x-hidden pb-20">
        {/* Patterned Background */}
        <div
          className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <header className="relative z-10 px-4 pt-6 pb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              {t("title")}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading || isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-white/50 text-xs font-medium">{t("subtitle")}</p>
            <Button
              onClick={handleCreate}
              size="sm"
              className="rounded-xl shadow-lg shadow-primary/20 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold h-9 px-4"
            >
              <Plus className="mr-1.5 h-4 w-4 stroke-[3px]" />
              {t("actions.newRoom")}
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rooms"
              className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
            />
          </div>
        </header>

        <div className="relative z-10 px-4 flex-1 grid! grid-cols-2! gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 w-full bg-white/5 rounded-2xl animate-pulse border border-white/10"
              />
            ))
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <LayoutGrid className="h-10 w-10 text-white/20" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-white/80">{t("empty.title")}</p>
                <p className="text-xs text-white/40 max-w-[200px]">
                  {t("empty.subtitle")}
                </p>
              </div>
            </div>
          ) : (
            rooms.map((room: RoomItem) => (
              <Card
                key={room.id}
                className="group relative border-white/10 bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden p-4 flex flex-col items-center text-center gap-3 active:scale-[0.98] transition-all min-h-[180px]"
              >
                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(room)}
                    className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-md border border-white/5"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRoomToDelete(room.id)}
                    className="h-8 w-8 rounded-xl bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-red-400 backdrop-blur-md border border-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className={cn(
                    "h-16 w-16 shrink-0 rounded-2xl bg-linear-to-br shadow-xl flex items-center justify-center text-3xl mt-1 ring-1 ring-white/10",
                    room.color || "from-blue-400 to-blue-600",
                  )}
                >
                  {room.icon || "🎉"}
                </div>

                <div className="flex-1 w-full flex flex-col items-center gap-1.5">
                  <span className="text-sm font-black truncate w-full px-1 leading-tight">
                    {room.name}
                  </span>

                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] h-5 px-2.5 font-black uppercase tracking-wider">
                    {room.price} ETB
                  </Badge>

                  <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5 font-medium px-2">
                    {room.description || t("fallbackDescription")}
                  </p>

                  <div className="flex items-center justify-center gap-2 mt-2 pt-3 border-t border-white/5 w-full">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                      {t("playersShort", {
                        min: room.minPlayers ?? 0,
                        max: room.maxPlayers ?? 0,
                      })}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      {t("status.active")}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="relative z-10 px-4 pt-4">
            <Card className="rounded-2xl border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl text-white disabled:text-white/30"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <div className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Page {page} / {totalPages}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl text-white disabled:text-white/30"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        <RoomDialog
          room={selectedRoom}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />

        <AlertDialog
          open={!!roomToDelete}
          onOpenChange={() => setRoomToDelete(null)}
        >
          <AlertDialogContent className="max-w-[320px] rounded-3xl border-white/10 bg-[#1a1c26] text-white shadow-2xl p-6">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-black text-center">
                {t("confirmDelete.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/50 text-xs text-center leading-relaxed">
                {t("confirmDelete.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6">
              <AlertDialogCancel className="mt-0 rounded-xl border-white/10 bg-white/5 text-xs font-bold h-10 hover:bg-white/10 hover:text-white">
                {t("actions.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="rounded-xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 text-xs font-bold h-10"
              >
                {isDeleting ? t("actions.deleting") : t("actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
