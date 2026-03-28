# SMS Forwarder Payment Endpoints

This document describes the two backend endpoints used by the SMS forwarder app to submit incoming payment SMS messages as pending payments.

## Production Base URL

Use this deployed backend base URL for production integration:

```text
https://www.mellapro.pro.et
```

Full production endpoints:

```text
https://www.mellapro.pro.et/payments/pending/telebirr
https://www.mellapro.pro.et/payments/pending/cbe
```

## Purpose

The flow is:

1. A user sends money to an agent.
2. The agent's SMS forwarder app receives the bank or Telebirr SMS.
3. The forwarder app sends the full SMS text to the backend.
4. The backend parses the SMS and stores a `pending` payment record.
5. The agent is notified on Telegram through the bot.
6. The user later pastes the same SMS into the deposit form.
7. The backend matches by transaction ID, approves the deposit, updates the user's balance, and notifies both the user and the agent.

## Security

Both forwarder endpoints require a shared secret in the request headers.

Header:

```text
x-sms-forwarder-secret: <SMS_FORWARDER_SECRET>
```

The backend reads this value from:

```env
SMS_FORWARDER_SECRET=your-strong-shared-secret
```

If the header is missing or incorrect, the backend returns:

```json
{
  "error": "invalid_forwarder_secret"
}
```

## Shared Request Contract

Both endpoints accept JSON with the same fields:

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "FULL ORIGINAL SMS TEXT"
}
```

### Fields

- `agentTelegramId`
  The Telegram ID of the target agent. The backend resolves the internal agent user from `users.telegramId`.

- `sms_content`
  The full SMS exactly as received on the phone. Do not trim, rewrite, translate, or normalize it before sending.

## Endpoint 1: Telebirr

### Request

```http
POST https://www.mellapro.pro.et/payments/pending/telebirr
Content-Type: application/json
x-sms-forwarder-secret: <SMS_FORWARDER_SECRET>
```

### Example Body

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "From: 127\n\nDear Muluken \nYou have received ETB 40.00 from yosef yohanis(2519****0965) 457619 on 27/03/2026 22:39:13. Your transaction number is DCR1AWETFL. Your current E-Money Account balance is ETB 2,435.33.\nThank you for using telebirr\nEthio telecom"
}
```

### Current Telebirr Parsing Rules

The backend currently extracts:

- `source` from `From: 127`
- `amount` from `received ETB 40.00`
- `phonenumber` from the masked or numeric sender section
- `datetime` from `on DD/MM/YYYY HH:mm:ss`
- `transaction number` from `Your transaction number is XXXXX`

### Success Response

Status:

```http
201 Created
```

Body:

```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "userId": null,
    "agentId": "agent-user-uuid",
    "source": "127",
    "amount": 40,
    "phonenumber": "2519****0965",
    "datetime": "2026-03-27T22:39:13.000Z",
    "transactionNumber": "DCR1AWETFL",
    "smsContent": "FULL ORIGINAL SMS TEXT",
    "status": "pending",
    "approvedAt": null,
    "createdAt": "2026-03-28T10:00:00.000Z",
    "updatedAt": "2026-03-28T10:00:00.000Z"
  }
}
```

## Endpoint 2: CBE

### Request

```http
POST https://www.mellapro.pro.et/payments/pending/cbe
Content-Type: application/json
x-sms-forwarder-secret: <SMS_FORWARDER_SECRET>
```

### Example Body

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "Dear Customer, your Account 1*****8066 has been Credited with ETB 250.00 from Milion Teka, on 28/03/2026 at 13:21:31 Ref No FT260759S9FL."
}
```

### Current CBE Parsing Rules

The backend currently extracts:

- `source` as `CBE`
- `amount` from `Credited with ETB ...`
- `phonenumber` from the sender name segment after `from`
- `datetime` from `on DD/MM/YYYY at HH:mm:ss`
- `transaction number` from `Ref No XXXXX`

### Success Response

Status:

```http
201 Created
```

Body shape is the same as the Telebirr endpoint.

## Error Responses

### Invalid secret

```http
401 Unauthorized
```

```json
{
  "error": "invalid_forwarder_secret"
}
```

### Missing or invalid agent Telegram ID

```http
400 Bad Request
```

```json
{
  "error": "agent_telegram_id_required"
}
```

### Agent not found

This happens when there is no agent user with the provided `users.telegramId`.

```http
404 Not Found
```

```json
{
  "error": "agent_not_found"
}
```

### SMS parse failure

```http
400 Bad Request
```

Telebirr:

```json
{
  "error": "Could not extract all required fields from SMS"
}
```

CBE:

```json
{
  "error": "Could not extract all required fields from CBE SMS"
}
```

### Duplicate transaction

If the same transaction number was already submitted before:

```http
409 Conflict
```

```json
{
  "error": "Payment with this transaction number already exists"
}
```

### Unsupported airtime SMS

Telebirr airtime messages are rejected:

```http
400 Bad Request
```

```json
{
  "error": "Transaction involves airtime, which is not supported"
}
```

## Forwarder App Implementation Notes

- Always send the original SMS text exactly as received.
- Do not remove newlines.
- Do not modify punctuation or spacing.
- Do not translate the message.
- Do not send partial SMS content.
- Retry carefully on network failures, but do not blindly retry forever.
- If the backend returns `409`, treat it as already submitted and stop retrying.
- If the backend returns `400`, the SMS likely does not match the expected format and should be logged for review.

## Recommended Forwarder Payload Example

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "FULL ORIGINAL SMS CONTENT"
}
```

## Postman Test Example

### Telebirr

URL:

```text
https://www.mellapro.pro.et/payments/pending/telebirr
```

Headers:

```text
Content-Type: application/json
x-sms-forwarder-secret: your-secret
```

Body:

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "From: 127\n\nDear Muluken \nYou have received ETB 40.00 from yosef yohanis(2519****0965) 457619 on 27/03/2026 22:39:13. Your transaction number is DCR1AWETFL. Your current E-Money Account balance is ETB 2,435.33.\nThank you for using telebirr\nEthio telecom"
}
```

### CBE

URL:

```text
https://www.mellapro.pro.et/payments/pending/cbe
```

Headers:

```text
Content-Type: application/json
x-sms-forwarder-secret: your-secret
```

Body:

```json
{
  "agentTelegramId": "123456789",
  "sms_content": "Dear Customer, your Account 1*****8066 has been Credited with ETB 250.00 from Milion Teka, on 28/03/2026 at 13:21:31 Ref No FT260759S9FL."
}
```

## Approval Flow After Forwarding

These endpoints only create a `pending` payment record.

The actual wallet credit happens later when the user submits the deposit form and the backend calls:

```http
POST https://www.mellapro.pro.et/payments/submit
```

That approval request sends:

```json
{
  "sms_content": "FULL ORIGINAL SMS TEXT",
  "promoCode": "OPTIONALCODE"
}
```

The backend then:

1. extracts the transaction ID
2. finds the pending payment
3. checks that it is not already approved
4. links the payment to the authenticated user
5. approves the deposit
6. credits the wallet balance
7. notifies both the user and the agent on Telegram
