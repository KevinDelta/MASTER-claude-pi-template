# commerce

Stripe commerce workflow protocol. Load for any turn that touches invoices, payment links, checkout sessions, refunds, or payment status.

## Before any commerce turn

1. Call `commerce_policy`. Check `key_mode`:
   - `not_configured` — stop. Tell the human the plugin needs a Stripe key before proceeding.
   - `live` — idempotency keys are required on all mutating calls (see below).
   - `test` — idempotency keys optional.

## Catalog-first lookup

Call `commerce_catalog_list` before constructing any invoice line item, payment link, or checkout session.

- For payment links and checkout sessions: use `stripe_price_id` from the matching entry.
- For invoice line items: use `unit_amount_cents` as `unit_amount` and `label` as `description`.
- If no catalog entry matches the requested service, surface this to the human before proceeding.

## Draft-before-send pattern

All mutating operations are two steps in two turns — never advance in the same turn.

| Step | Action |
|------|--------|
| 1. Draft | Call the draft tool or prepare params. Present the full output to the human. Stop. |
| 2. Send | Only after the human explicitly confirms. Carry their literal message as `approval_reference`. |

**Explicit confirmation required.** "Looks good" or "ok" alone is not sufficient — ask for explicit confirmation ("send it", "approved", "go ahead") before calling any send/execute/create tool.

## Tool map

| Intent | Draft | Send / Execute | Approval |
|--------|-------|----------------|----------|
| Invoice | `commerce_invoice_draft` | `commerce_invoice_send` | Required |
| Payment link | Prepare params, present | `commerce_payment_link_create` | Required unless auto-approved by policy |
| Checkout Session | Prepare params, present | `commerce_checkout_create` | Required |
| Refund | `commerce_refund_draft` | `commerce_refund_execute` | Always required |

## Read-only tools (no approval needed)

- `commerce_policy` — policy, key mode, approval gate summary
- `commerce_catalog_list` — approved services and Stripe price IDs
- `commerce_payment_status` — bounded payment state for a session, invoice, intent, or link
- `commerce_event_list` — recent payment event summaries (raw payload export denied by plugin)

## Idempotency keys (live mode only)

When `key_mode` is `live`, include an idempotency key on every mutating call:

```
<domain>-<tool-short>-<YYYYMMDD>-<client-slug>
```

Example: `acme-invoice-send-20260526-globex`

Omit in test mode.

## Hard stops

- Never call a send/execute tool without explicit human confirmation in the current turn.
- Never use `sk_live_*` keys — the plugin rejects them. Restricted `rk_live_*` keys only.
- Never export raw Stripe event payloads.
- Never handle card data.
- Never modify Stripe products, prices, tax settings, or payout configuration.
