import { inArray, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { adminSettings } from "../db/schema.js";

export type EditableConfigDefinition = {
  key: string;
  value: string;
  label: string;
  description: string;
  kind: "amount" | "fraction" | "integer";
};

export const editableConfigDefinitions = {
  agent_commission: {
    key: "agent_commission",
    value: "0.10",
    label: "Agent Commission",
    description: "Given to agent on transaction",
    kind: "fraction",
  },
  welcome_bonus: {
    key: "welcome_bonus",
    value: "10.00",
    label: "Welcome Bonus",
    description: "Given to user on first registration",
    kind: "amount",
  },
  referral_reward: {
    key: "referral_reward",
    value: "0.00",
    label: "Referral Reward",
    description: "Given to referrer when friend joins",
    kind: "amount",
  },
  service_charge: {
    key: "service_charge",
    value: "0.20",
    label: "Service Charge",
    description: "Deducted from user transaction",
    kind: "fraction",
  },
  countdownSeconds: {
    key: "countdownSeconds",
    value: "45",
    label: "Countdown Seconds",
    description: "How long a room waits before drawing starts.",
    kind: "integer",
  },
  callIntervalMs: {
    key: "callIntervalMs",
    value: "3000",
    label: "Call Interval (ms)",
    description: "Delay between called numbers during an active session.",
    kind: "integer",
  },
  totalNumbers: {
    key: "totalNumbers",
    value: "75",
    label: "Total Numbers",
    description: "How many draw numbers are available in a session.",
    kind: "integer",
  },
} as const satisfies Record<string, {
  key: string;
  value: string;
  label: string;
  description: string;
  kind: "amount" | "fraction" | "integer";
}>;

export type EditableConfigKey = keyof typeof editableConfigDefinitions;

export type EditableConfig = {
  key: string;
  value: string;
  label: string;
  description: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type StoredConfigValue = Partial<
  Pick<EditableConfig, "key" | "value" | "label" | "description">
>;

function getDefinition(key: string) {
  return editableConfigDefinitions[key as EditableConfigKey] ?? null;
}

function normalizeEditableConfig(
  key: string,
  stored?: unknown,
  createdAt?: Date,
  updatedAt?: Date,
): EditableConfig | null {
  const definition = getDefinition(key);
  if (!definition) {
    return null;
  }

  const value =
    stored && typeof stored === "object"
      ? (stored as StoredConfigValue)
      : {};

  return {
    key: definition.key,
    value:
      typeof value.value === "string" || typeof value.value === "number"
        ? String(value.value)
        : definition.value,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : definition.label,
    description:
      typeof value.description === "string"
        ? value.description
        : definition.description,
    createdAt: createdAt ?? null,
    updatedAt: updatedAt ?? null,
  };
}

export async function getEditableConfig(
  key: string,
): Promise<EditableConfig | null> {
  const definition = getDefinition(key);
  if (!definition) {
    return null;
  }

  const [row] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);

  return normalizeEditableConfig(
    key,
    row?.value,
    row?.createdAt,
    row?.updatedAt,
  );
}

export async function listEditableConfigs(
  keys: string[] = Object.keys(editableConfigDefinitions),
): Promise<EditableConfig[]> {
  const validKeys = keys.filter(
    (key, index) => getDefinition(key) && keys.indexOf(key) === index,
  );
  if (validKeys.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(adminSettings)
    .where(inArray(adminSettings.key, validKeys));

  const rowMap = new Map(rows.map((row) => [row.key, row]));

  return validKeys
    .map((key) => {
      const row = rowMap.get(key);
      return normalizeEditableConfig(
        key,
        row?.value,
        row?.createdAt,
        row?.updatedAt,
      );
    })
    .filter((config): config is EditableConfig => Boolean(config));
}

export async function upsertEditableConfig(
  key: string,
  patch: Partial<Pick<EditableConfig, "value" | "label" | "description">>,
): Promise<EditableConfig | null> {
  const current = await getEditableConfig(key);
  if (!current) {
    return null;
  }

  const next = {
    key: current.key,
    value: patch.value ?? current.value,
    label: patch.label ?? current.label,
    description: patch.description ?? current.description,
  };

  const [row] = await db
    .insert(adminSettings)
    .values({
      key,
      value: next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminSettings.key,
      set: {
        value: next,
        updatedAt: new Date(),
      },
    })
    .returning();

  return normalizeEditableConfig(key, row.value, row.createdAt, row.updatedAt);
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getKindDefault(key: EditableConfigKey) {
  return editableConfigDefinitions[key];
}

export async function getWelcomeBonusCents(): Promise<number> {
  const config = await getEditableConfig("welcome_bonus");
  const fallback = parseNumber(getKindDefault("welcome_bonus").value, 10);
  return Math.max(
    Math.round(parseNumber(config?.value ?? "", fallback) * 100),
    0,
  );
}

export async function getAgentCommissionBps(): Promise<number> {
  const config = await getEditableConfig("agent_commission");
  const fallback = parseNumber(getKindDefault("agent_commission").value, 0.1);
  return Math.max(
    Math.round(parseNumber(config?.value ?? "", fallback) * 10000),
    0,
  );
}

export async function getSessionConfigNumbers() {
  const [countdown, interval, total] = await Promise.all([
    getEditableConfig("countdownSeconds"),
    getEditableConfig("callIntervalMs"),
    getEditableConfig("totalNumbers"),
  ]);

  return {
    countdownSeconds: Math.max(
      Math.floor(
        parseNumber(
          countdown?.value ?? "",
          parseNumber(getKindDefault("countdownSeconds").value, 45),
        ),
      ),
      1,
    ),
    callIntervalMs: Math.max(
      Math.floor(
        parseNumber(
          interval?.value ?? "",
          parseNumber(getKindDefault("callIntervalMs").value, 3000),
        ),
      ),
      250,
    ),
    totalNumbers: Math.max(
      Math.floor(
        parseNumber(
          total?.value ?? "",
          parseNumber(getKindDefault("totalNumbers").value, 75),
        ),
      ),
      25,
    ),
  };
}
