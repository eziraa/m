"use client";

import { useMemo, useState } from "react";
import { Loader2, Percent, Coins, Hash, Save, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type { GameConfig } from "@/lib/api";
import { useGetGameConfigQuery, useUpdateGameConfigMutation } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function getKindLabel(kind: GameConfig["kind"]) {
  switch (kind) {
    case "amount":
      return "Amount";
    case "fraction":
      return "Fraction";
    case "integer":
      return "Integer";
  }
}

function getKindHint(kind: GameConfig["kind"]) {
  switch (kind) {
    case "amount":
      return "Use a non-negative amount like 10 or 10.50";
    case "fraction":
      return "Use a fraction between 0 and 1, like 0.10";
    case "integer":
      return "Use a whole number like 45 or 3000";
  }
}

function getKindIcon(kind: GameConfig["kind"]) {
  switch (kind) {
    case "amount":
      return Coins;
    case "fraction":
      return Percent;
    case "integer":
      return Hash;
  }
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "Using default value";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function validateValue(config: GameConfig, nextValue: string) {
  const trimmed = nextValue.trim();
  if (!trimmed) {
    return "Value is required";
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return "Value must be numeric";
  }

  if (config.kind === "integer" && (!Number.isInteger(parsed) || parsed < 0)) {
    return "Enter a non-negative whole number";
  }

  if (config.kind === "fraction" && (parsed < 0 || parsed > 1)) {
    return "Enter a value between 0 and 1";
  }

  if (config.kind === "amount" && parsed < 0) {
    return "Enter a non-negative amount";
  }

  return null;
}

function ConfigEditorCard({
  config,
  draftValue,
  isEditing,
  isSaving,
  error,
  onEdit,
  onCancel,
  onChange,
  onSave,
}: {
  config: GameConfig;
  draftValue: string;
  isEditing: boolean;
  isSaving: boolean;
  error: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const Icon = getKindIcon(config.kind);

  return (
    <Card className="h-full border-border/70">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription>{config.key}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              {getKindLabel(config.kind)}
            </Badge>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current value
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {config.value}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {formatUpdatedAt(config.updatedAt)}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-foreground">{config.description || "No description provided."}</p>
          <p className="text-xs text-muted-foreground">{getKindHint(config.kind)}</p>
        </div>

        {isEditing ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`config-${config.key}`}>
                New value
              </label>
              <Input
                id={`config-${config.key}`}
                value={draftValue}
                onChange={(event) => onChange(event.target.value)}
                inputMode={config.kind === "integer" ? "numeric" : "decimal"}
                placeholder={config.value}
                disabled={isSaving}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                <RotateCcw className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function GameConfigAdmin() {
  const { data, isLoading, isFetching } = useGetGameConfigQuery();
  const [updateGameConfig, { isLoading: isSaving }] =
    useUpdateGameConfigMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const configs = useMemo(() => data?.configs ?? [], [data?.configs]);

  const groupedStats = useMemo(() => {
    return {
      total: configs.length,
      monetary: configs.filter((config) => config.kind === "amount").length,
      gameplay: configs.filter((config) => config.kind === "integer").length,
      fees: configs.filter((config) => config.kind === "fraction").length,
    };
  }, [configs]);

  const handleStartEdit = (config: GameConfig) => {
    setEditingKey(config.key);
    setDraftValue(config.value);
    setFormError(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setDraftValue("");
    setFormError(null);
  };

  const handleSave = async (config: GameConfig) => {
    const validationError = validateValue(config, draftValue);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await updateGameConfig({
        key: config.key,
        data: { value: draftValue.trim() },
      }).unwrap();
      toast.success(`${config.label} updated`);
      handleCancel();
    } catch (error: any) {
      const message =
        error?.data?.error === "config_value_must_be_fraction"
          ? "This setting must stay between 0 and 1"
          : error?.data?.error === "config_value_must_be_non_negative_integer"
            ? "This setting requires a non-negative whole number"
            : error?.data?.error === "config_value_must_be_non_negative"
              ? "This setting cannot be negative"
              : error?.data?.error === "config_value_must_be_numeric"
                ? "This setting must be numeric"
                : "Failed to update the setting";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Admin configuration
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Game Settings</h1>
          <p className="text-muted-foreground">
            Manage rewards, fees, and session timing from one place.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {isFetching && !isLoading ? "Refreshing..." : `${groupedStats.total} settings`}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Monetary rules</CardDescription>
            <CardTitle className="text-2xl">{groupedStats.monetary}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Welcome and referral values that affect wallet balances.
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Fee percentages</CardDescription>
            <CardTitle className="text-2xl">{groupedStats.fees}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fraction-based settings used for commission and service charge.
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Gameplay timing</CardDescription>
            <CardTitle className="text-2xl">{groupedStats.gameplay}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Countdown, number calling speed, and total draw size.
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/70">
              <CardHeader>
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            configs.length > 1 ? "xl:grid-cols-2" : "max-w-2xl",
          )}
        >
          {configs.map((config) => (
            <ConfigEditorCard
              key={config.key}
              config={config}
              draftValue={editingKey === config.key ? draftValue : config.value}
              isEditing={editingKey === config.key}
              isSaving={isSaving && editingKey === config.key}
              error={editingKey === config.key ? formError : null}
              onEdit={() => handleStartEdit(config)}
              onCancel={handleCancel}
              onChange={setDraftValue}
              onSave={() => handleSave(config)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
