import {
  bigint,
  bigserial,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "AGENT", "USER"]);

export const roomStatusEnum = pgEnum("room_status", [
  "active",
  "suspended",
  "archived",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "waiting",
  "countdown",
  "playing",
  "finished",
  "cancelled",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const patternTypeEnum = pgEnum("pattern_type", [
  "row",
  "column",
  "diagonal",
  "full_house",
  "corners",
]);

export const ledgerTypeEnum = pgEnum("ledger_type", [
  "deposit",
  "board_purchase",
  "session_win",
  "commission",
  "withdrawal",
  "adjustment",
  "referral_reward",
]);

export const ledgerStatusEnum = pgEnum("ledger_status", ["posted", "reversed"]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "approved",
  "rejected",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
]);

export const bonusTypeEnum = pgEnum("bonus_type", ["percentage", "fixed"]);
export const postTargetEnum = pgEnum("post_target", ["users", "channel"]);
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "failed",
]);
export const deliveryDeletionStatusEnum = pgEnum("delivery_deletion_status", [
  "none",
  "queued",
  "deleted",
  "failed",
  "cancelled",
]);
export const broadcastDeleteModeEnum = pgEnum("broadcast_delete_mode", [
  "selected",
  "all",
  "date_range",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "done",
  "failed",
  "cancelled",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: userRoleEnum("role").default("USER").notNull(),
    telegramId: text("telegram_id"),
    referralCode: text("referral_code"),
    referredByAgentId: uuid("referred_by_agent_id"),
    email: text("email"),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    referredByAgentFk: foreignKey({
      columns: [table.referredByAgentId],
      foreignColumns: [table.id],
      name: "fk_users_referred_by_agent",
    }).onDelete("set null"),
    telegramIdUq: uniqueIndex("uq_users_telegram_id").on(table.telegramId),
    referralCodeUq: uniqueIndex("uq_users_referral_code").on(
      table.referralCode,
    ),
    roleCreatedIdx: index("idx_users_role_created_at").on(
      table.role,
      table.createdAt,
    ),
    referredByAgentIdx: index("idx_users_referred_by_agent").on(
      table.referredByAgentId,
    ),
  }),
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    boardPriceCents: bigint("board_price_cents", { mode: "number" }).notNull(),
    status: roomStatusEnum("status").default("active").notNull(),
    color: text("color").notNull().default("from-blue-500 to-blue-700"),
    minPlayers: integer("min_players").default(2),
    maxPlayers: integer("max_players"),
    icon: text("icon"),
    botAllowed: boolean("bot_allowed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    agentStatusCreatedIdx: index("idx_rooms_agent_status_created").on(
      table.agentId,
      table.status,
      table.createdAt,
    ),
    statusCreatedIdx: index("idx_rooms_status_created").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: sessionStatusEnum("status").default("waiting").notNull(),
    countdownSeconds: integer("countdown_seconds").default(45).notNull(),
    countdownResets: integer("countdown_resets").default(0).notNull(),
    callIntervalMs: integer("call_interval_ms").default(3000).notNull(),
    totalNumbers: integer("total_numbers").default(75).notNull(),
    currentSeq: integer("current_seq").default(0).notNull(),
    currentNumber: integer("current_number"),
    winnerUserId: uuid("winner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    version: integer("version").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roomStatusCreatedIdx: index("idx_sessions_room_status_created").on(
      table.roomId,
      table.status,
      table.createdAt,
    ),
    agentStatusCreatedIdx: index("idx_sessions_agent_status_created").on(
      table.agentId,
      table.status,
      table.createdAt,
    ),
    statusCreatedIdx: index("idx_sessions_status_created").on(
      table.status,
      table.createdAt,
    ),
    activeSessionPerRoomUq: uniqueIndex("uq_sessions_one_active_per_room")
      .on(table.roomId)
      .where(sql`${table.status} in ('countdown', 'playing')`),
  }),
);

export const sessionCalledNumbers = pgTable(
  "session_called_numbers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    number: integer("number").notNull(),
    calledAt: timestamp("called_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionSeqUq: uniqueIndex("uq_called_numbers_session_seq").on(
      table.sessionId,
      table.seq,
    ),
    sessionNumberUq: uniqueIndex("uq_called_numbers_session_number").on(
      table.sessionId,
      table.number,
    ),
    sessionCalledAtIdx: index("idx_called_numbers_session_called_at").on(
      table.sessionId,
      table.calledAt,
    ),
  }),
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardNo: integer("board_no").notNull(),
    boardMatrix: jsonb("board_matrix").notNull(),
    boardHash: text("board_hash").notNull(),
    purchaseAmountCents: bigint("purchase_amount_cents", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionUserIdx: index("idx_boards_session_user").on(
      table.sessionId,
      table.userId,
    ),
    userCreatedIdx: index("idx_boards_user_created").on(
      table.userId,
      table.createdAt,
    ),
    sessionBoardNoUq: uniqueIndex("uq_boards_session_board_no").on(
      table.sessionId,
      table.boardNo,
    ),
    sessionBoardHashUq: uniqueIndex("uq_boards_session_board_hash").on(
      table.sessionId,
      table.boardHash,
    ),
  }),
);

export const localAuthCredentials = pgTable(
  "local_auth_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userUq: uniqueIndex("uq_local_auth_user").on(table.userId),
    emailUq: uniqueIndex("uq_local_auth_email").on(table.email),
  }),
);

export const boardPurchaseRequests = pgTable(
  "board_purchase_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    quantity: integer("quantity").notNull(),
    boardIds: jsonb("board_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionUserIdempotencyUq: uniqueIndex(
      "uq_board_purchase_req_session_user_key",
    ).on(table.sessionId, table.userId, table.idempotencyKey),
    userCreatedIdx: index("idx_board_purchase_req_user_created").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const bingoClaims = pgTable(
  "bingo_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    pattern: patternTypeEnum("pattern").notNull(),
    markedCells: jsonb("marked_cells").notNull(),
    clientLastSeq: integer("client_last_seq").notNull(),
    status: claimStatusEnum("status").default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    sessionUserIdempotencyUq: uniqueIndex(
      "uq_claims_session_user_idempotency",
    ).on(table.sessionId, table.userId, table.idempotencyKey),
    sessionCreatedIdx: index("idx_claims_session_created").on(
      table.sessionId,
      table.createdAt,
    ),
    userCreatedIdx: index("idx_claims_user_created").on(
      table.userId,
      table.createdAt,
    ),
    statusCreatedIdx: index("idx_claims_status_created").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const sessionWinners = pgTable(
  "session_winners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => bingoClaims.id, { onDelete: "cascade" }),
    payoutCents: bigint("payout_cents", { mode: "number" }).notNull(),
    commissionCents: bigint("commission_cents", { mode: "number" })
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionUq: uniqueIndex("uq_winners_session").on(table.sessionId),
    claimUq: uniqueIndex("uq_winners_claim").on(table.claimId),
    userCreatedIdx: index("idx_winners_user_created").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const walletLedger = pgTable(
  "wallet_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => gameSessions.id, {
      onDelete: "set null",
    }),
    boardId: uuid("board_id").references(() => boards.id, {
      onDelete: "set null",
    }),
    entryType: ledgerTypeEnum("entry_type").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    balanceAfterCents: bigint("balance_after_cents", { mode: "number" }),
    currency: varchar("currency", { length: 8 }).default("ETB").notNull(),
    status: ledgerStatusEnum("status").default("posted").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdempotencyUq: uniqueIndex("uq_wallet_user_idempotency").on(
      table.userId,
      table.idempotencyKey,
    ),
    userCreatedIdx: index("idx_wallet_user_created").on(
      table.userId,
      table.createdAt,
    ),
    agentCreatedIdx: index("idx_wallet_agent_created").on(
      table.agentId,
      table.createdAt,
    ),
    sessionCreatedIdx: index("idx_wallet_session_created").on(
      table.sessionId,
      table.createdAt,
    ),
  }),
);

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    promoCode: text("promo_code"),
    status: depositStatusEnum("status").default("pending").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userStatusCreatedIdx: index("idx_deposits_user_status_created").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    statusCreatedIdx: index("idx_deposits_status_created").on(
      table.status,
      table.createdAt,
    ),
    promoCodeIdx: index("idx_deposits_promo_code").on(table.promoCode),
  }),
);

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    phone: text("phone").notNull(),
    status: withdrawalStatusEnum("status").default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userStatusCreatedIdx: index("idx_withdrawals_user_status_created").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    statusCreatedIdx: index("idx_withdrawals_status_created").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    bonusType: bonusTypeEnum("bonus_type").notNull(),
    bonusValueBps: integer("bonus_value_bps"),
    bonusValueCents: bigint("bonus_value_cents", { mode: "number" }),
    maxUsers: integer("max_users").notNull(),
    usedCount: integer("used_count").default(0).notNull(),
    minimumDepositCents: bigint("minimum_deposit_cents", {
      mode: "number",
    })
      .default(0)
      .notNull(),
    maximumBonusCapCents: bigint("maximum_bonus_cap_cents", {
      mode: "number",
    }).notNull(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeUq: uniqueIndex("uq_promo_codes_code").on(table.code),
    activeExpiryIdx: index("idx_promo_codes_active_expiry").on(
      table.isActive,
      table.expiryDate,
    ),
    createdAtIdx: index("idx_promo_codes_created_at").on(table.createdAt),
    promoCodeTypeCheck: sql`check ((
      ${table.bonusType} = 'percentage' and ${table.bonusValueBps} is not null and ${table.bonusValueBps} > 0 and ${table.bonusValueCents} is null
    ) or (
      ${table.bonusType} = 'fixed' and ${table.bonusValueCents} is not null and ${table.bonusValueCents} > 0 and ${table.bonusValueBps} is null
    ))`,
  }),
);

export const promoCodeUsages = pgTable(
  "promo_code_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promoCodeId: uuid("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    depositId: uuid("deposit_id")
      .notNull()
      .references(() => deposits.id, { onDelete: "cascade" }),
    bonusAmountCents: bigint("bonus_amount_cents", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    depositUq: uniqueIndex("uq_promo_usage_deposit").on(table.depositId),
    userPromoUq: uniqueIndex("uq_promo_usage_user_promo").on(
      table.userId,
      table.promoCodeId,
    ),
    promoCreatedIdx: index("idx_promo_usage_promo_created").on(
      table.promoCodeId,
      table.createdAt,
    ),
    userCreatedIdx: index("idx_promo_usage_user_created").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const adminSettings = pgTable(
  "admin_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    updatedAtIdx: index("idx_admin_settings_updated_at").on(table.updatedAt),
  }),
);

export const postCategories = pgTable(
  "post_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    channelChatId: text("channel_chat_id"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameUq: uniqueIndex("uq_post_categories_name").on(table.name),
    slugUq: uniqueIndex("uq_post_categories_slug").on(table.slug),
    activeIdx: index("idx_post_categories_active").on(table.isActive),
  }),
);

export const broadcastPosts = pgTable(
  "broadcast_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    format: text("format").default("markdown").notNull(),
    target: postTargetEnum("target").default("users").notNull(),
    categoryId: uuid("category_id").references(() => postCategories.id, {
      onDelete: "set null",
    }),
    images: jsonb("images").notNull().default([]),
    buttons: jsonb("buttons").notNull().default([]),
    status: postStatusEnum("status").default("draft").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusUpdatedIdx: index("idx_broadcast_posts_status_updated").on(
      table.status,
      table.updatedAt,
    ),
    scheduledIdx: index("idx_broadcast_posts_scheduled").on(
      table.scheduledAt,
      table.status,
    ),
    targetIdx: index("idx_broadcast_posts_target").on(table.target),
  }),
);

export const postDeliveries = pgTable(
  "post_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => broadcastPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    chatId: text("chat_id").notNull(),
    status: deliveryStatusEnum("status").default("pending").notNull(),
    messageId: text("message_id"),
    errorMessage: text("error_message"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deletionStatus: deliveryDeletionStatusEnum("deletion_status")
      .default("none")
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    postStatusIdx: index("idx_post_deliveries_post_status").on(
      table.postId,
      table.status,
      table.createdAt,
    ),
    chatIdx: index("idx_post_deliveries_chat").on(table.chatId, table.createdAt),
    userIdx: index("idx_post_deliveries_user").on(table.userId, table.createdAt),
    deletionIdx: index("idx_post_deliveries_deletion").on(
      table.postId,
      table.deletionStatus,
      table.createdAt,
    ),
    uniquePostRecipient: uniqueIndex("uq_post_deliveries_post_chat").on(
      table.postId,
      table.chatId,
    ),
  }),
);

export const broadcastDeleteJobs = pgTable(
  "broadcast_delete_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => broadcastPosts.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    mode: broadcastDeleteModeEnum("mode").notNull(),
    status: jobStatusEnum("status").default("queued").notNull(),
    filters: jsonb("filters").notNull().default({}),
    totalTargeted: integer("total_targeted").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    postCreatedIdx: index("idx_broadcast_delete_jobs_post_created").on(
      table.postId,
      table.createdAt,
    ),
    statusIdx: index("idx_broadcast_delete_jobs_status").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const telegramUpdates = pgTable(
  "telegram_updates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    updateId: bigint("update_id", { mode: "number" }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    telegramUserId: text("telegram_user_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    updateEventUq: uniqueIndex("uq_telegram_updates_update_event").on(
      table.updateId,
      table.eventType,
    ),
    telegramUserCreatedIdx: index("idx_telegram_updates_user_created").on(
      table.telegramUserId,
      table.createdAt,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type BingoClaim = typeof bingoClaims.$inferSelect;
export type SessionWinner = typeof sessionWinners.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type PromoCodeUsage = typeof promoCodeUsages.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type PostCategory = typeof postCategories.$inferSelect;
export type BroadcastPost = typeof broadcastPosts.$inferSelect;
export type PostDelivery = typeof postDeliveries.$inferSelect;
export type BroadcastDeleteJob = typeof broadcastDeleteJobs.$inferSelect;
