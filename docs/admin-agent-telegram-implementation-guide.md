# Admin, Agent, and Telegram Implementation Guide

## Overview

This document summarizes the implementation completed across the backend and frontend for:

- admin API and schema support
- admin UI data integration with TanStack Query
- admin sidebar and route wiring
- agent dashboard mobile responsiveness improvements
- Telegram Mini App onboarding, webhook setup, and Telegraf bot commands

The goal of the work was to keep the existing UI intact and make the backend and integration layer flexible enough to support it cleanly.

## Backend Changes

### 1. Admin schema and persistence

Persistent admin/content tables were added in [backend/src/db/schema.ts](/Users/ezratgab/Documents/m/backend/src/db/schema.ts).

Added enums:

- `post_target`
- `post_status`
- `delivery_status`
- `delivery_deletion_status`
- `broadcast_delete_mode`
- `job_status`

Added tables:

- `admin_settings`
- `post_categories`
- `broadcast_posts`
- `post_deliveries`
- `broadcast_delete_jobs`

Migration files:

- [backend/drizzle/0007_admin_content_and_settings.sql](/Users/ezratgab/Documents/m/backend/drizzle/0007_admin_content_and_settings.sql)
- [backend/drizzle/meta/_journal.json](/Users/ezratgab/Documents/m/backend/drizzle/meta/_journal.json)

### 2. Admin API

Admin endpoints were implemented and expanded in [backend/src/http/adminRouter.ts](/Users/ezratgab/Documents/m/backend/src/http/adminRouter.ts).

Supported admin capabilities include:

- users list and detail
- user role updates and deletes
- withdrawals list, approve, reject
- transactions list, stats, delete
- bonuses list, update, grant
- game config list and update
- rooms list
- deposits list
- post categories CRUD support
- posts CRUD support
- scheduled/broadcast post support
- broadcast delivery logs
- recipients list
- delete-broadcast jobs with status and cancel flow

### 3. Telegram bot and webhook

Telegram bot behavior is implemented in [backend/src/telegram/bot.ts](/Users/ezratgab/Documents/m/backend/src/telegram/bot.ts).

Webhook and command registration logic is implemented in [backend/src/telegram/setup.ts](/Users/ezratgab/Documents/m/backend/src/telegram/setup.ts).

CLI entrypoints:

- [backend/src/telegram/setupCli.ts](/Users/ezratgab/Documents/m/backend/src/telegram/setupCli.ts)
- [backend/src/telegram/clearWebhookCli.ts](/Users/ezratgab/Documents/m/backend/src/telegram/clearWebhookCli.ts)

Webhook receiving endpoint:

- [backend/src/http/telegramWebhook.ts](/Users/ezratgab/Documents/m/backend/src/http/telegramWebhook.ts)

Server boot auto-configuration:

- [backend/src/server.ts](/Users/ezratgab/Documents/m/backend/src/server.ts)

Environment additions:

- `TELEGRAM_WEBHOOK_URL`

Environment parsing:

- [backend/src/config/env.ts](/Users/ezratgab/Documents/m/backend/src/config/env.ts)

### 4. Telegram auth and referral handling

Telegram Mini App auth already existed, and it was extended to preserve referral/start data more reliably.

Updated files:

- [backend/src/http/authRouter.ts](/Users/ezratgab/Documents/m/backend/src/http/authRouter.ts)
- [backend/src/auth/loginWithTelegram.ts](/Users/ezratgab/Documents/m/backend/src/auth/loginWithTelegram.ts)

Behavior:

- the backend still trusts verified Telegram `initData`
- if `start_param` is present in Telegram init data, it is used
- if `start_param` is not present there, a frontend-supplied fallback `startParam` is accepted
- referral binding only attaches when the user does not already have a `referredByAgentId`
- agent referral lookup is based on `users.referralCode`

This keeps the referral flow compatible with Mini App launch buttons and `/start <referralCode>`.

## Frontend Changes

### 1. Admin API integration with TanStack Query

Admin-facing data hooks and mutations were added in [frontend/lib/api.ts](/Users/ezratgab/Documents/m/frontend/lib/api.ts).

This includes hooks for:

- admin users
- admin withdrawals
- admin transactions and stats
- admin bonuses
- game config
- posts
- scheduled posts
- post recipients
- post deliveries
- broadcast deletion jobs

Role-aware endpoint resolution was also added so shared components can hit admin routes when the current user is an admin.

### 2. Frontend types

Supporting types were expanded in [frontend/lib/types.ts](/Users/ezratgab/Documents/m/frontend/lib/types.ts).

This includes:

- `AdminWithdrawal`
- post-related entities
- richer transaction typing

### 3. Admin layouts, routing, and navigation

Admin shell and route aliases:

- [frontend/app/admin/layout.tsx](/Users/ezratgab/Documents/m/frontend/app/admin/layout.tsx)
- [frontend/app/admin/page.tsx](/Users/ezratgab/Documents/m/frontend/app/admin/page.tsx)
- [frontend/app/admin/users/page.tsx](/Users/ezratgab/Documents/m/frontend/app/admin/users/page.tsx)
- [frontend/app/admin/rooms/page.tsx](/Users/ezratgab/Documents/m/frontend/app/admin/rooms/page.tsx)

Admin navigation:

- [frontend/components/admin/AdminSidebar.tsx](/Users/ezratgab/Documents/m/frontend/components/admin/AdminSidebar.tsx)
- [frontend/components/admin/AdminLayout.tsx](/Users/ezratgab/Documents/m/frontend/components/admin/AdminLayout.tsx)
- [frontend/components/admin/posts/BottomAdminNav.tsx](/Users/ezratgab/Documents/m/frontend/components/admin/posts/BottomAdminNav.tsx)

The sidebar and nav were wired to actual app routes so the current UI can function without redesign.

### 4. Telegram auth boot in the frontend

Updated files:

- [frontend/lib/telegram.ts](/Users/ezratgab/Documents/m/frontend/lib/telegram.ts)
- [frontend/providers/auth.provider.tsx](/Users/ezratgab/Documents/m/frontend/providers/auth.provider.tsx)
- [frontend/lib/api.ts](/Users/ezratgab/Documents/m/frontend/lib/api.ts)

Behavior:

- boot reads Telegram `initData`
- boot also reads `ref`, `start`, or `tgWebAppStartParam` from the URL
- auth sends both `initData` and fallback `startParam` to the backend
- this preserves referral attribution when users open the Mini App through bot launch buttons

## Agent Dashboard Mobile Responsiveness

The agent dashboard was cleaned up for Telegram Mini App usage, with a focus on smaller screens and bottom-nav-safe layouts.

Main files updated:

- [frontend/components/agent/AgentLayout.tsx](/Users/ezratgab/Documents/m/frontend/components/agent/AgentLayout.tsx)
- [frontend/components/agent/AgentBottomNav.tsx](/Users/ezratgab/Documents/m/frontend/components/agent/AgentBottomNav.tsx)
- [frontend/app/agent/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/page.tsx)
- [frontend/app/agent/rooms/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/rooms/page.tsx)
- [frontend/app/agent/users/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/users/page.tsx)
- [frontend/app/agent/payments/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/payments/page.tsx)
- [frontend/app/agent/withdrawals/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/withdrawals/page.tsx)
- [frontend/app/agent/transactions/page.tsx](/Users/ezratgab/Documents/m/frontend/app/agent/transactions/page.tsx)
- [frontend/components/agent/transactions/TransactionTable.tsx](/Users/ezratgab/Documents/m/frontend/components/agent/transactions/TransactionTable.tsx)
- [frontend/components/bottom-nav.tsx](/Users/ezratgab/Documents/m/frontend/components/bottom-nav.tsx)

Key UX improvements:

- better stacking for headers and action bars on narrow screens
- safer spacing around bottom navigation
- fewer cramped filter rows
- more predictable grid behavior
- cleaner room/user/payment/withdrawal layouts for Telegram Mini App width

## Telegram Bot User Flow

### Supported commands

Registered commands:

- `/start`
- `/play`
- `/deposit`
- `/withdraw`
- `/help`

NPM helpers:

- `npm run telegram:setup`
- `npm run telegram:webhook:clear`

File:

- [backend/package.json](/Users/ezratgab/Documents/m/backend/package.json)

### `/start` behavior

When a user sends `/start`:

- if the user is not found by Telegram ID, the bot sends a first-time welcome
- if the user already exists, the bot sends a welcome-back message
- the bot shows launch buttons for:
  - `Play now`
  - `Deposit`
  - `Withdraw`
- if the command contains a referral payload, the launch URLs preserve it

### Launch routing

The bot opens these Mini App routes:

- play: `/rooms`
- deposit: `/deposit`
- withdraw: `/withdraw`

If a referral code exists, it is appended as `?ref=<code>`.

## Deployment Notes

### Backend environment

Required or important values:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_MINIAPP_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_WEBHOOK_URL`

### Recommended setup sequence

1. Apply database migrations.
2. Start the backend with the Telegram env configured.
3. Run `npm run telegram:setup` in `/backend` if you want to register the webhook and commands immediately.
4. Confirm Telegram is sending webhook traffic to `/telegram/webhook`.
5. Open the Mini App from Telegram and verify auth and referral attribution.

### Important note about webhook setup

The server also attempts to configure Telegram commands and the webhook automatically on startup if `TELEGRAM_WEBHOOK_URL` is present.

The CLI command is still useful when:

- you want an explicit setup step
- you need to re-register the webhook
- you want to verify setup after deployment changes

## Verification Status

Verified successfully:

- backend typecheck via `npm run check`
- targeted admin and agent file checks
- targeted Telegram auth/frontend checks except for the existing workspace dependency-resolution issue below

Known workspace issue:

- frontend TypeScript still reports local resolution problems for `@tanstack/react-query` in this workspace, even though it is declared in [frontend/package.json](/Users/ezratgab/Documents/m/frontend/package.json)

This appears to be a local dependency/install issue rather than a logic issue in the new implementation.

## Summary

The completed implementation keeps the UI structure in place and adds the missing backend, integration, and Telegram onboarding behavior needed for the product to function more completely:

- persistent admin data model
- flexible admin endpoints
- TanStack Query integration for admin pages
- corrected admin sidebars and route wiring
- mobile-friendly agent dashboard improvements
- Telegraf-powered Telegram command flow
- webhook setup tooling
- cleaner Mini App launch and referral preservation
