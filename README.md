# DawaPOS

Pharmacy point-of-sale and inventory system. Static web app (HTML/CSS/JS) hosted on GitHub Pages, with cloud sync, data storage, and SMS delivery powered by Supabase.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell and page markup |
| `styles.css` | All styling |
| `app1.js` | Cloud sync, auth, POS, checkout, receipts, invoices, SMS client |
| `app2.js` | Inventory, receive stock, credits, sales history |
| `app3.js` | Expenses, reminders, suppliers, users, settings, dashboard, analytics |
| `sms-core.js` / `sms.test.js` | Shared SMS helpers + unit tests (`node sms.test.js`) |

## SMS receipts (transactional SMS)

Receipt SMS messages are sent automatically after checkout when a customer phone
number is entered, via a Supabase Edge Function called `send-sms`. The gateway
API key never touches the browser — it lives only in Supabase secrets.

### How it works

1. Cashier enters the customer's phone at checkout (optional field above the checkout button).
2. `processCheckout()` completes and saves the sale first — the sale never waits on SMS.
3. `sendGatewaySms()` calls the `send-sms` function (non-blocking) with the rendered message.
4. The function validates/normalizes the number (E.164, e.g. `+255...`), sends via the provider,
   retries once after 3 seconds on failure, and logs everything to the `dawapos_sms_log` table.
5. The sale record stores `smsStatus` (`pending` / `sent` / `failed` / `test`), the gateway
   message ID, and any error. A failed SMS never fails or rolls back the sale.
6. Manual retry: open the receipt (POS or Sales History) and tap **Auto-SMS**.

### Going live (required secrets)

Add these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

| Secret | Value |
|---|---|
| `AT_USERNAME` | Africa's Talking app username (`sandbox` while testing) |
| `AT_API_KEY` | Africa's Talking API key |
| `SMS_SENDER_ID` | Your registered sender ID (optional; omit to use the shared/test sender) |

For Twilio instead: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`, then switch
**Settings → SMS Receipts → Provider** to Twilio in the app.

**Until credentials are added the function runs in TEST mode**: messages are
validated, normalized, and written to `dawapos_sms_log` with status `test`,
but nothing is delivered. Use **Settings → SMS Receipts → Send Test SMS** to
verify the pipeline end to end at any time.

Africa's Talking sandbox: set `AT_USERNAME=sandbox` with a sandbox API key and
use https://api.sandbox.africastalking.com behavior automatically.

### Configuration (in the app, Settings → SMS Receipts)

- **Enable/disable** automatic receipt SMS (`smsEnabled`)
- **Provider** (`africastalking` or `twilio`)
- **Default country code** used to normalize local numbers (e.g. `255`)
- **Message template** with placeholders:
  `{business} {receipt} {date} {items} {itemCount} {total} {payments} {balance} {customer}`

### Consent / compliance

Only transactional receipts are sent, and only when a phone number is provided
for that sale — no marketing messages. The assumption is that a customer who
gives their number at the till consents to receiving that receipt; confirm this
matches your local regulations (TZ/KE generally treat transactional receipts as
permitted service messages).

### Failure logging and retry

Every attempt is a row in `dawapos_sms_log` (sale id, phone, message, status,
provider, gateway id, error, attempt count, timestamps). One automatic retry
after 3 s is built into the function; further retries are manual via the
**Auto-SMS** button on any receipt.

### Switching providers later

The function supports Africa's Talking and Twilio. To add another gateway,
add a `sendViaX()` function in the `send-sms` edge function alongside the
existing two and extend the provider switch — the client just passes the
provider name from Settings.

### Tests

```
node sms.test.js
```

Covers phone normalization, template rendering, and the send/retry logic with a
mocked gateway (success, fail-then-succeed, persistent failure). End-to-end test
without a real sale: **Settings → SMS Receipts → Send Test SMS**.
