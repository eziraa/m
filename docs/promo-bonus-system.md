# Promo Code Bonus System

## Scope

This design adds promo-code bonuses to the deposit approval workflow without changing existing wallet/game mechanics.

## New Database Objects

### Tables

1. `deposits`

- Stores user deposit requests.
- Promo code is captured at request time but evaluated only at approval time.

2. `promo_codes`

- Admin-managed promo definitions.
- Supports `percentage` and `fixed` bonus types.
- Tracks global usage with `used_count` and `max_users`.

3. `promo_code_usages`

- Immutable audit row for each granted promo bonus.
- Links user + promo + deposit + credited bonus amount.

### Key Indexes

- `uq_promo_codes_code` for O(log n) promo lookup by code.
- `idx_deposits_status_created` and `idx_deposits_user_status_created` for approval queues and user history.
- `uq_promo_usage_deposit` to prevent duplicate bonus for one deposit.
- `uq_promo_usage_user_promo` to prevent repeated usage by same user.
- `idx_promo_usage_promo_created` for admin analytics by promo and time.

## Transaction Flow: Deposit Approval

All logic runs in one PostgreSQL transaction:

1. Lock deposit row with `FOR UPDATE`.
2. Ensure deposit is still `pending`.
3. Insert wallet ledger credit for deposit amount with deterministic idempotency key.
4. If promo code exists:
   - Atomically claim promo usage slot using guarded `UPDATE ... SET used_count = used_count + 1 ... RETURNING`.
   - Compute bonus.
   - Insert `promo_code_usages` row.
   - Insert wallet ledger bonus credit.
5. Mark deposit as `approved`.
6. Commit.

Any error rolls back all operations, including usage counter increments.

## Concurrency Guarantees

- `FOR UPDATE` on deposit row prevents double approval.
- Atomic guarded update prevents `used_count` from exceeding `max_users`.
- Unique usage constraints prevent duplicate bonus recording.
- Wallet idempotency keys prevent duplicate ledger credits per deposit path.

## Endpoints

### User

- `POST /wallet/deposit`
  - Body: `{ amount: number, promoCode?: string | null }`
  - Stores pending deposit only.

### Admin Promo Management

- `POST /admin/promocodes`
- `GET /admin/promocodes`
- `PATCH /admin/promocodes/:id`
- `DELETE /admin/promocodes/:id` (soft delete as `is_active=false`)

### Admin Deposit Approval

- `POST /admin/deposits/:id/approve`

## Example Responses

### Create Deposit

```json
{
  "ok": true,
  "deposit": {
    "id": "8f0e0d8b-8d63-43d8-afd8-f8f08d1f9858",
    "userId": "f2577651-ce89-4e72-87bc-7c61bd5fd736",
    "amount": 250,
    "promoCode": "WELCOME50",
    "status": "PENDING",
    "createdAt": "2026-03-13T12:15:42.120Z"
  }
}
```

### Approve Deposit (Promo Applied)

```json
{
  "ok": true,
  "deposit": {
    "id": "8f0e0d8b-8d63-43d8-afd8-f8f08d1f9858",
    "status": "APPROVED",
    "amount": 250
  },
  "promo": {
    "applied": true,
    "code": "WELCOME50",
    "reason": "applied",
    "bonusAmountCents": 12500,
    "bonusAmount": 125
  }
}
```

### Approve Deposit (Promo Rejected, Deposit Still Approved)

```json
{
  "ok": true,
  "deposit": {
    "id": "8f0e0d8b-8d63-43d8-afd8-f8f08d1f9858",
    "status": "APPROVED",
    "amount": 250
  },
  "promo": {
    "applied": false,
    "code": "WELCOME50",
    "reason": "exhausted",
    "bonusAmountCents": 0,
    "bonusAmount": 0
  }
}
```

## Security Notes

- Promo validation is server-side at approval only.
- Promo code from client cannot force bonus if constraints fail at approval time.
- Double processing prevented by row locks + unique keys + deterministic idempotency keys.
- Admin APIs are role-gated (`ADMIN`).

## Optional Redis Strategy

Use Redis as a read-through cache for promo metadata to reduce read load for admin listing and user-side UX hints, but never trust cache for approval decisions.

- Cache key: `promo:code:{CODE}`
- TTL: 15-60 seconds
- Invalidate on create/update/delete promo APIs
- Approval transaction still validates and claims in PostgreSQL only
