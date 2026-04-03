"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as apiHooks from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Loader2 } from "lucide-react";

export function SubmitPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"telebirr" | "cbe">("cbe");
  const [smsContent, setSmsContent] = useState("");

  const [submitTelebirr, { isLoading: isSubmittingTelebirr }] =
    apiHooks.useSubmitTelebirrPaymentMutation();
  const [submitCBE, { isLoading: isSubmittingCBE }] =
    apiHooks.useSubmitCBEPaymentMutation();

  const isSubmitting = isSubmittingTelebirr || isSubmittingCBE;

  const handleSubmit = async () => {
    if (!smsContent.trim()) {
      toast.error("Please paste the SMS content.");
      return;
    }

    try {
      if (source === "telebirr") {
        await submitTelebirr({ sms_content: smsContent }).unwrap();
      } else {
        await submitCBE({ sms_content: smsContent }).unwrap();
      }

      toast.success("Transaction submitted and logged successfully.");

      setSmsContent("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to submit transaction.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 w-full">
          <Plus className="mr-2 h-4 w-4" />
          Submit Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit Manual Transaction</DialogTitle>
          <DialogDescription>
            Select the source and paste the EXACT SMS content to register the
            deposit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Source</span>
            <Select value={source} onValueChange={(val: any) => setSource(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cbe">
                  Commercial Bank of Ethiopia (CBE)
                </SelectItem>
                <SelectItem value="telebirr">Telebirr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">SMS Content</span>
            <Textarea
              placeholder={
                source === "cbe"
                  ? "Dear Ezira your Account 1*****8066 has been Credited..."
                  : "Telebirr SMS..."
              }
              className="resize-none min-h-[120px]"
              value={smsContent}
              onChange={(e) => setSmsContent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !smsContent.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
