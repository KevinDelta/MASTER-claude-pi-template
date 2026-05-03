import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const DEFAULT_STRIPE_API_VERSION = "2026-02-25.clover";
const STRIPE_API_BASE = "https://api.stripe.com";

type Json = Record<string, unknown>;

function expandHome(input: string): string {
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function configValue(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function domainName(): string {
  return configValue("OPENCLAW_DOMAIN_NAME", "default");
}

function workspaceDir(): string {
  return path.join(os.homedir(), ".openclaw", "workspaces", domainName());
}

function stripeApiKeyEnv(): string {
  return configValue("DOMAIN_COMMERCE_STRIPE_KEY_ENV", "STRIPE_RESTRICTED_KEY");
}

function stripeApiKey(): string | null {
  return process.env[stripeApiKeyEnv()] || null;
}

function stripeApiVersion(): string {
  return configValue("STRIPE_API_VERSION", DEFAULT_STRIPE_API_VERSION);
}

function catalogPath(): string {
  return expandHome(configValue("DOMAIN_COMMERCE_CATALOG_PATH", path.join(workspaceDir(), "commerce-catalog.json")));
}

function maxAutoApprovedAmountCents(): number {
  return Number(process.env.DOMAIN_COMMERCE_MAX_AUTO_APPROVED_AMOUNT_CENTS || 0) || 0;
}

function allowPaymentLinksWithoutApproval(): boolean {
  return process.env.DOMAIN_COMMERCE_ALLOW_PAYMENT_LINKS_WITHOUT_APPROVAL === "true";
}

function requireStripeKey(): string {
  const key = stripeApiKey();
  if (!key) {
    throw new Error(`Stripe API key is not configured. Set ${stripeApiKeyEnv()} in the domain environment.`);
  }
  if (key.startsWith("sk_live_") && process.env.DOMAIN_COMMERCE_ALLOW_LIVE_SECRET_KEY !== "true") {
    throw new Error("Live broad secret keys are out of bounds for domain-commerce. Use a restricted live key with an rk_live_ prefix.");
  }
  return key;
}

function keyMode(): string {
  const key = stripeApiKey();
  if (!key) return "not_configured";
  if (key.startsWith("rk_live_") || key.startsWith("sk_live_")) return "live";
  if (key.startsWith("rk_test_") || key.startsWith("sk_test_")) return "test";
  return "unknown";
}

function redactId(input: string | undefined): string | null {
  if (!input) return null;
  if (input.length <= 12) return input;
  return `${input.slice(0, 8)}...${input.slice(-4)}`;
}

function appendForm(form: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendForm(form, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value as Json)) {
      appendForm(form, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  form.append(key, String(value));
}

function toForm(payload: Json): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) appendForm(form, key, value);
  return form;
}

async function stripeRequest(method: string, endpoint: string, payload?: Json, idempotencyKey?: string): Promise<Json> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireStripeKey()}`,
    "Stripe-Version": stripeApiVersion(),
  };
  let body: URLSearchParams | undefined;
  if (payload) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = toForm(payload);
  }
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${STRIPE_API_BASE}${endpoint}`, { method, headers, body });
  const text = await res.text();
  const data = text ? JSON.parse(text) as Json : {};
  if (!res.ok) {
    const error = data.error as Json | undefined;
    const message = typeof error?.message === "string" ? error.message : `Stripe request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function approvedForAmount(params: { approved?: boolean; amountCents?: number }): boolean {
  if (params.approved) return true;
  if (!allowPaymentLinksWithoutApproval()) return false;
  if (!params.amountCents) return false;
  const max = maxAutoApprovedAmountCents();
  return max > 0 && params.amountCents <= max;
}

function lineItemsTotal(lineItems: Array<{ quantity?: number; price_data?: { unit_amount?: number } }>): number | null {
  let total = 0;
  for (const item of lineItems) {
    const unit = item.price_data?.unit_amount;
    if (typeof unit !== "number") return null;
    total += unit * (item.quantity ?? 1);
  }
  return total;
}

function summarizeStripeObject(obj: Json): Json {
  return {
    id: obj.id,
    object: obj.object,
    status: obj.status,
    payment_status: obj.payment_status,
    amount_total: obj.amount_total,
    amount_due: obj.amount_due,
    amount_paid: obj.amount_paid,
    currency: obj.currency,
    url: obj.url,
    hosted_invoice_url: obj.hosted_invoice_url,
    invoice_pdf: obj.invoice_pdf,
    created: obj.created,
    livemode: obj.livemode,
  };
}

export default definePluginEntry({
  id: "domain-commerce",
  name: "Domain Commerce",
  description: "Stripe workflow tools with explicit approval gates and bounded summaries.",
  register(api) {
    api.registerTool({
      name: "commerce_policy",
      description: "Return Stripe commerce policy and configuration status without exposing secrets.",
      parameters: Type.Object({}),
      async execute() {
        return { content: [{ type: "text", text: JSON.stringify({
          stripe_api_version: stripeApiVersion(),
          key_env: stripeApiKeyEnv(),
          key_mode: keyMode(),
          catalog_path: catalogPath(),
          approval_required_for: [
            "creating Checkout Sessions",
            "creating live Payment Links unless explicitly allowlisted",
            "sending or finalizing invoices",
            "executing refunds",
          ],
          hosted_surfaces_only: true,
          raw_event_export: "denied",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_catalog_list",
      description: "Return approved local catalog entries. Does not call Stripe or expose secrets.",
      parameters: Type.Object({}),
      async execute() {
        const file = catalogPath();
        if (!fs.existsSync(file)) {
          return { content: [{ type: "text", text: JSON.stringify({
            catalog: [],
            note: `No catalog found at ${file}. Create commerce-catalog.json with approved services, Stripe price IDs, and amount limits before using commerce tools.`,
          }, null, 2) }] };
        }
        const catalog = JSON.parse(fs.readFileSync(file, "utf8"));
        return { content: [{ type: "text", text: JSON.stringify({ catalog }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_invoice_draft",
      description: "Draft invoice data for worker review. This does not create or send a Stripe invoice.",
      parameters: Type.Object({
        customer: Type.String(),
        project: Type.Optional(Type.String()),
        currency: Type.String({ default: "usd" }),
        memo: Type.Optional(Type.String()),
        line_items: Type.Array(Type.Object({
          description: Type.String(),
          unit_amount: Type.Number(),
          quantity: Type.Optional(Type.Number()),
        })),
      }),
      async execute(_id, params: {
        customer: string;
        project?: string;
        currency: string;
        memo?: string;
        line_items: Array<{ description: string; unit_amount: number; quantity?: number }>;
      }) {
        const amount_due = params.line_items.reduce((sum, item) => sum + item.unit_amount * (item.quantity ?? 1), 0);
        return { content: [{ type: "text", text: JSON.stringify({
          draft_only: true,
          customer: params.customer,
          project: params.project ?? process.env.PROJECT_ID ?? null,
          currency: params.currency,
          memo: params.memo ?? null,
          line_items: params.line_items,
          amount_due,
          next_step: "Worker reviews this draft. To send through Stripe, create/review the invoice in Stripe and call commerce_invoice_send with approved=true.",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_invoice_send",
      description: "Finalize and send an existing Stripe invoice. Requires explicit worker approval.",
      parameters: Type.Object({
        invoice_id: Type.String(),
        approved: Type.Boolean(),
        approval_reference: Type.String(),
        finalize: Type.Optional(Type.Boolean()),
        idempotency_key: Type.Optional(Type.String()),
      }),
      async execute(_id, params: {
        invoice_id: string;
        approved: boolean;
        approval_reference: string;
        finalize?: boolean;
        idempotency_key?: string;
      }) {
        if (!params.approved) throw new Error("Worker approval is required before sending an invoice.");
        let invoice: Json = await stripeRequest("GET", `/v1/invoices/${encodeURIComponent(params.invoice_id)}`);
        if (params.finalize && invoice.status === "draft") {
          invoice = await stripeRequest("POST", `/v1/invoices/${encodeURIComponent(params.invoice_id)}/finalize`, undefined, params.idempotency_key ? `${params.idempotency_key}-finalize` : undefined);
        }
        const sent = await stripeRequest("POST", `/v1/invoices/${encodeURIComponent(params.invoice_id)}/send`, undefined, params.idempotency_key ? `${params.idempotency_key}-send` : undefined);
        return { content: [{ type: "text", text: JSON.stringify({ invoice: summarizeStripeObject(sent) }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_payment_link_create",
      description: "Create a Stripe Payment Link. Requires approval unless bounded auto-approval is configured.",
      parameters: Type.Object({
        line_items: Type.Array(Type.Object({
          price: Type.String(),
          quantity: Type.Optional(Type.Number()),
        })),
        approved: Type.Optional(Type.Boolean()),
        approval_reference: Type.Optional(Type.String()),
        amount_cents: Type.Optional(Type.Number()),
        idempotency_key: Type.Optional(Type.String()),
        metadata: Type.Optional(Type.Record(Type.String(), Type.String())),
      }),
      async execute(_id, params: {
        line_items: Array<{ price: string; quantity?: number }>;
        approved?: boolean;
        approval_reference?: string;
        amount_cents?: number;
        idempotency_key?: string;
        metadata?: Record<string, string>;
      }) {
        if (!approvedForAmount({ approved: params.approved, amountCents: params.amount_cents })) {
          throw new Error("Worker approval is required before creating a Payment Link.");
        }
        const link = await stripeRequest("POST", "/v1/payment_links", {
          line_items: params.line_items,
          metadata: {
            ...(params.metadata ?? {}),
            approval_reference: params.approval_reference ?? "auto-approved-by-policy",
            project: process.env.PROJECT_ID ?? "",
            source: "openclaw-domain-commerce",
          },
        }, params.idempotency_key);
        return { content: [{ type: "text", text: JSON.stringify({ payment_link: summarizeStripeObject(link) }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_checkout_create",
      description: "Create a one-time hosted Stripe Checkout Session. Requires explicit worker approval.",
      parameters: Type.Object({
        success_url: Type.String(),
        cancel_url: Type.String(),
        line_items: Type.Array(Type.Any()),
        approved: Type.Boolean(),
        approval_reference: Type.String(),
        customer: Type.Optional(Type.String()),
        customer_email: Type.Optional(Type.String()),
        idempotency_key: Type.Optional(Type.String()),
        metadata: Type.Optional(Type.Record(Type.String(), Type.String())),
      }),
      async execute(_id, params: {
        success_url: string;
        cancel_url: string;
        line_items: Array<{ quantity?: number; price_data?: { unit_amount?: number } } & Json>;
        approved: boolean;
        approval_reference: string;
        customer?: string;
        customer_email?: string;
        idempotency_key?: string;
        metadata?: Record<string, string>;
      }) {
        if (!params.approved) throw new Error("Worker approval is required before creating a Checkout Session.");
        const session = await stripeRequest("POST", "/v1/checkout/sessions", {
          mode: "payment",
          success_url: params.success_url,
          cancel_url: params.cancel_url,
          customer: params.customer,
          customer_email: params.customer_email,
          line_items: params.line_items,
          metadata: {
            ...(params.metadata ?? {}),
            approval_reference: params.approval_reference,
            project: process.env.PROJECT_ID ?? "",
            source: "openclaw-domain-commerce",
            estimated_total_cents: lineItemsTotal(params.line_items) ?? "",
          },
        }, params.idempotency_key);
        return { content: [{ type: "text", text: JSON.stringify({ checkout_session: summarizeStripeObject(session) }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_payment_status",
      description: "Retrieve bounded payment state for a Checkout Session, Invoice, PaymentIntent, or Payment Link.",
      parameters: Type.Object({
        object_type: Type.Union([
          Type.Literal("checkout_session"),
          Type.Literal("invoice"),
          Type.Literal("payment_intent"),
          Type.Literal("payment_link"),
        ]),
        id: Type.String(),
      }),
      async execute(_id, params: { object_type: string; id: string }) {
        const endpoints: Record<string, string> = {
          checkout_session: `/v1/checkout/sessions/${encodeURIComponent(params.id)}`,
          invoice: `/v1/invoices/${encodeURIComponent(params.id)}`,
          payment_intent: `/v1/payment_intents/${encodeURIComponent(params.id)}`,
          payment_link: `/v1/payment_links/${encodeURIComponent(params.id)}`,
        };
        const object = await stripeRequest("GET", endpoints[params.object_type]);
        return { content: [{ type: "text", text: JSON.stringify({ payment_state: summarizeStripeObject(object) }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_event_list",
      description: "List recent Stripe payment events as bounded summaries. Raw event payload export is denied.",
      parameters: Type.Object({
        limit: Type.Optional(Type.Number()),
        type: Type.Optional(Type.String()),
      }),
      async execute(_id, params: { limit?: number; type?: string }) {
        const query = new URLSearchParams();
        query.set("limit", String(Math.min(params.limit ?? 10, 25)));
        if (params.type) query.set("type", params.type);
        const events = await stripeRequest("GET", `/v1/events?${query.toString()}`);
        const data = Array.isArray(events.data) ? events.data as Json[] : [];
        return { content: [{ type: "text", text: JSON.stringify({
          events: data.map((event) => {
            const eventData = event.data as Json | undefined;
            const object = eventData?.object as Json | undefined;
            return {
              id: event.id,
              type: event.type,
              created: event.created,
              livemode: event.livemode,
              object_id: object?.id,
              object_type: object?.object,
              status: object?.status,
              payment_status: object?.payment_status,
            };
          }),
          raw_payload_export: "denied",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_refund_draft",
      description: "Draft refund details for worker review. This does not execute a refund.",
      parameters: Type.Object({
        payment_intent: Type.Optional(Type.String()),
        charge: Type.Optional(Type.String()),
        amount: Type.Optional(Type.Number()),
        reason: Type.Optional(Type.String()),
      }),
      async execute(_id, params: { payment_intent?: string; charge?: string; amount?: number; reason?: string }) {
        return { content: [{ type: "text", text: JSON.stringify({
          draft_only: true,
          payment_intent: redactId(params.payment_intent),
          charge: redactId(params.charge),
          amount: params.amount ?? null,
          reason: params.reason ?? null,
          next_step: "Worker reviews the refund. Execute only with commerce_refund_execute and approved=true.",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "commerce_refund_execute",
      description: "Execute a Stripe refund. Always requires explicit worker approval.",
      parameters: Type.Object({
        approved: Type.Boolean(),
        approval_reference: Type.String(),
        payment_intent: Type.Optional(Type.String()),
        charge: Type.Optional(Type.String()),
        amount: Type.Optional(Type.Number()),
        reason: Type.Optional(Type.String()),
        idempotency_key: Type.Optional(Type.String()),
        metadata: Type.Optional(Type.Record(Type.String(), Type.String())),
      }),
      async execute(_id, params: {
        approved: boolean;
        approval_reference: string;
        payment_intent?: string;
        charge?: string;
        amount?: number;
        reason?: string;
        idempotency_key?: string;
        metadata?: Record<string, string>;
      }) {
        if (!params.approved) throw new Error("Worker approval is required before executing a refund.");
        if (!params.payment_intent && !params.charge) throw new Error("Refund requires payment_intent or charge.");
        const refund = await stripeRequest("POST", "/v1/refunds", {
          payment_intent: params.payment_intent,
          charge: params.charge,
          amount: params.amount,
          reason: params.reason,
          metadata: {
            ...(params.metadata ?? {}),
            approval_reference: params.approval_reference,
            source: "openclaw-domain-commerce",
          },
        }, params.idempotency_key);
        return { content: [{ type: "text", text: JSON.stringify({ refund: summarizeStripeObject(refund) }, null, 2) }] };
      },
    });
  },
});
