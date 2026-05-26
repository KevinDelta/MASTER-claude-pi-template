# Stripe Workflow

This framework treats Stripe as the receivables and payment-state rail. It does
not make the agent a free-running finance operator.

## Current Stripe Baseline

- API version pinned by the template: `2026-02-25.clover`
- Preferred surfaces: Payment Links, hosted Checkout Sessions, and Stripe Invoices
- Deprecated surfaces out of bounds: Charges API, Sources API, Tokens API, legacy Card Element
- Card data handling out of bounds: the framework must not collect, process, log, or store raw PAN/CVC data

Stripe's version page says monthly releases are backward-compatible inside a
major family. Re-check Stripe's API version page before changing the pinned
version or SDK strategy.

## Installed Pieces

The optional plugin lives at:

```text
domain/openclaw/plugins/domain-commerce/
```

Install it with:

```bash
./install.sh --domain <domain> --persona <persona> --enable-commerce
```

The installer copies the plugin to:

```text
~/.openclaw/plugins/domain-commerce-<domain>/
```

The domain `.env.example` declares the required commerce variables. Use a
restricted Stripe key (`rk_test_*` or `rk_live_*`) with the minimum permissions
needed by the enabled tools. Live broad secret keys (`sk_live_*`) are rejected
unless the worker deliberately overrides that guard.

## Tool Contract

| Tool | Purpose | Side Effect |
|------|---------|-------------|
| `commerce_policy` | Show configured policy and key mode without secrets | none |
| `commerce_catalog_list` | Read approved local service/catalog entries | none |
| `commerce_invoice_draft` | Prepare invoice data for review | none |
| `commerce_invoice_send` | Finalize/send an existing Stripe invoice | external side effect, approval required |
| `commerce_payment_link_create` | Create a Stripe Payment Link | external side effect, approval required unless bounded allowlist is configured |
| `commerce_checkout_create` | Create a hosted Checkout Session | external side effect, approval required |
| `commerce_payment_status` | Retrieve bounded payment state | Stripe read |
| `commerce_event_list` | Summarize recent payment events | Stripe read, raw payload denied |
| `commerce_refund_draft` | Prepare refund data for review | none |
| `commerce_refund_execute` | Execute a refund | external side effect, approval required |

Approval means the worker has explicitly accepted the action, amount, project,
client/customer, and Stripe object involved. The tool call records this with
`approved: true` and an `approval_reference`.

## Workflow

1. Route the task through `AGENTS.md` using a `Commerce / ...` row.
2. Read `DOCK.md` and project `TOOLS.md` before calling commerce tools.
3. Use `commerce_policy` and `commerce_catalog_list` to check configuration and approved prices.
4. Draft first: `commerce_invoice_draft` or `commerce_refund_draft`.
5. Ask the worker to approve the exact side effect when required.
6. Execute through the narrow Stripe tool.
7. Verify completion with `commerce_payment_status` or `commerce_event_list`.
8. Store only bounded payment summaries in memory; never raw Stripe event payloads.

## Constraints

- Use restricted Stripe keys wherever possible. A separate key per environment is preferred.
- Store keys only in the domain runtime environment or a secrets manager, never in repo files.
- Use hosted Stripe surfaces so card data stays with Stripe.
- Verify payment completion through Stripe webhooks or status reads. Success URLs and memory notes are not proof of payment.
- Raw event payloads, full financial records, customer PII, tax details, and key material are not exported by default.
- Stripe can charge a client for supplies or expenses, but it does not purchase supplies from third-party vendors.
- Refund execution is always approval-gated.
- Machine payments and autonomous purchasing are future tracks, not v1 assumptions.

## Catalog Shape

`commerce_catalog_list` expects a worker-maintained JSON file at
`DOMAIN_COMMERCE_CATALOG_PATH`, usually:

```text
~/.openclaw/workspace/commerce-catalog.json
```

Suggested shape:

```json
{
  "services": [
    {
      "slug": "strategy-session",
      "label": "Strategy session",
      "stripe_price_id": "price_...",
      "currency": "usd",
      "unit_amount": 50000,
      "approval_required": true
    }
  ],
  "expense_categories": [
    {
      "slug": "client-approved-supplies",
      "approval_required": true
    }
  ]
}
```

Catalog entries are policy data, not authorization by themselves. `DOCK.md` and
the plugin approval gates still decide which actions may run.
