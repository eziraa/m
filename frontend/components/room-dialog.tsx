"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Room } from "@/lib/types";
import { useCreateRoomMutation, useUpdateRoomMutation } from "@/lib/api";

const roomSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  minPlayers: z.coerce.number().min(2),
  maxPlayers: z.coerce.number().min(2),
  color: z.string().default("from-green-400 to-green-600"),
  icon: z.string().default("🎉"),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface RoomDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const icons = [
  "🎉",
  "😉",
  "😈",
  "🥳",
  "🌌",
  "🌙",
  "💎",
  "👑",
  "💰",
  "🔥",
  "🎲",
  "🚀",
];
const colors = [
  { label: "Blue", value: "from-green-400 to-green-600" },
  { label: "Purple", value: "from-purple-400 to-purple-600" },
  { label: "Emerald", value: "from-emerald-400 to-emerald-600" },
  { label: "Amber", value: "from-amber-400 to-amber-600" },
  { label: "Rose", value: "from-rose-400 to-rose-600" },
  { label: "Cyan", value: "from-cyan-400 to-cyan-600" },
  { label: "Pink", value: "from-pink-400 to-pink-600" },
  { label: "Orange", value: "from-orange-400 to-orange-600" },
  { label: "Yellow", value: "from-yellow-400 to-yellow-600" },
  { label: "Lime", value: "from-lime-400 to-lime-600" },
  { label: "Teal", value: "from-teal-400 to-teal-600" },
  { label: "Indigo", value: "from-emerald-400 to-emerald-600" },
  { label: "Violet", value: "from-violet-400 to-violet-600" },
];

export function RoomDialog({ room, open, onOpenChange }: RoomDialogProps) {
  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();

  const form = useForm({
    resolver: zodResolver(roomSchema as any),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      minPlayers: 2,
      maxPlayers: 10,
      color: "from-green-400 to-green-600",
      icon: "🎉",
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({
        name: room.name,
        description: room.description || "",
        price: room.price.toString(),
        minPlayers: room.minPlayers,
        maxPlayers: room.maxPlayers,
        color: room.color || "from-green-400 to-green-600",
        icon: room.icon || "🎉",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        minPlayers: 2,
        maxPlayers: 10,
        color: "from-green-400 to-green-600",
        icon: "🎉",
      });
    }
  }, [room, form, open]);

  async function onSubmit(values: RoomFormValues) {
    try {
      if (room) {
        await updateRoom({ id: room.id, ...values }).unwrap();
        toast.success("Room updated successfully");
      } else {
        await createRoom(values).unwrap();
        toast.success("Room created successfully");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.data?.error || "Failed to save room");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-3xl border-white/10 bg-[#1a1c26] text-white shadow-2xl p-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-center">
            {room ? "Edit Room" : "New Room"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                    Room Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. VIP Lounge"
                      className="h-11 rounded-xl bg-white/5 border-white/10 text-sm focus:ring-green-500/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                      Entry Fee (ETB)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        className="h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                      Icon
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl"
                      >
                        {field.value}
                      </button>
                      <div className="flex-1 flex flex-wrap gap-1.5 max-h-[44px] overflow-hidden">
                        {icons.slice(0, 4).map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => field.onChange(icon)}
                            className={cn(
                              "w-9 h-9 flex items-center justify-center rounded-lg border border-white/5 bg-white/5 active:scale-90 transition-all",
                              field.value === icon &&
                                "border-primary bg-primary/20",
                            )}
                          >
                            <span className="text-lg">{icon}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Full icon picker could be a popover, but for now we'll just show a few or simplified grid */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icons.slice(4).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => field.onChange(icon)}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-lg border border-white/5 bg-white/5 active:scale-90 transition-all",
                            field.value === icon &&
                              "border-primary bg-primary/20",
                          )}
                        >
                          <span className="text-lg">{icon}</span>
                        </button>
                      ))}
                    </div>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Describe the excitement..."
                      className="h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minPlayers"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                      Min Players
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                      Max Players
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] uppercase tracking-wider font-black text-white/40 ml-1">
                    Theme Color
                  </FormLabel>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => field.onChange(c.value)}
                        className={cn(
                          "h-10 rounded-lg bg-linear-to-br transition-all flex items-center justify-center",
                          c.value,
                          field.value === c.value
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-[#1a1c26] scale-105"
                            : "opacity-40 hover:opacity-100",
                        )}
                      >
                        {field.value === c.value && (
                          <Check
                            size={14}
                            className="text-white drop-shadow-sm"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="grid grid-cols-2 gap-3 pt-4 mt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl border-white/10 bg-white/5 text-xs font-bold h-11 hover:bg-white/10 hover:text-white"
                onClick={() => onOpenChange(false)}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full rounded-xl bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20 text-xs font-bold h-11"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating
                  ? "Saving..."
                  : room
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
