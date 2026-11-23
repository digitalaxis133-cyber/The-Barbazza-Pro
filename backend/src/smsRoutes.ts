import { Router } from "express";
import { z } from "zod";
import { allow, requireAuth } from "./auth";
import { num, query } from "./db";

export const smsRoutes = Router();

type SmsRow = {
  sms_id: number;
  sender: string;
  body: string;
  received_at: string;
  provider: string;
  amount: string | null;
  currency: string | null;
  direction: string;
  is_read: boolean;
  raw_payload: unknown;
  created_at: string;
};

function inboundToken() {
  return (process.env.SMS_INBOUND_TOKEN || "").trim();
}

function headerValue(headers: Record<string, unknown>, name: string) {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

function extractToken(req: { headers: Record<string, unknown>; query: Record<string, unknown>; body?: unknown }) {
  const headerNames = [
    "x-sms-token",
    "x-api-key",
    "api-key",
    "x-auth-token",
    "token",
    "sms-token",
  ];
  for (const name of headerNames) {
    const value = headerValue(req.headers, name);
    if (value) return value;
  }

  const auth = headerValue(req.headers, "authorization");
  if (auth) {
    const lower = auth.toLowerCase();
    if (lower.startsWith("bearer ")) return auth.slice(7).trim();
    if (lower.startsWith("token ")) return auth.slice(6).trim();
    // Some forwarders put the raw secret in Authorization with no scheme
    if (!lower.includes(" ")) return auth;
  }

  const qKeys = ["token", "key", "api_key", "apikey", "secret", "sms_token"];
  for (const key of qKeys) {
    const value = pickString(req.query, [key]);
    if (value) return value;
  }

  if (req.body && typeof req.body === "object" && req.body !== null && !Array.isArray(req.body)) {
    const body = req.body as Record<string, unknown>;
    for (const key of qKeys) {
      const value = pickString(body, [key]);
      if (value) return value;
    }
  }
  return "";
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function parseReceivedAt(raw: string) {
  if (!raw) return new Date();
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 1_000_000_000) {
    // seconds vs ms
    return new Date(asNum < 1_000_000_000_000 ? asNum * 1000 : asNum);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function enrichSms(sender: string, body: string) {
  const hay = `${sender} ${body}`.toLowerCase();
  let provider = "other";
  if (hay.includes("airtel")) provider = "airtel";
  else if (hay.includes("momo") || hay.includes("mtn") || sender.replace(/\s+/g, "").match(/momo|mtn/i)) provider = "mtn";
  else if (hay.includes("bk ") || hay.includes("bank of kigali") || hay.includes("equity")) provider = "bank";

  let direction = "unknown";
  if (/\b(received|umepokea|incom(?:e|ing)|credited|deposit)\b/i.test(body)) direction = "in";
  else if (/\b(sent|umepeleka|paid|payment|withdraw|debit)\b/i.test(body)) direction = "out";

  const amountMatch =
    body.match(/(?:RWF|FRW|FRw|Frw)\s*([\d,.]+)/i) ||
    body.match(/([\d,.]+)\s*(?:RWF|FRW|FRw|Frw)/i) ||
    body.match(/(?:amount|amt)[:\s]+([\d,.]+)/i);

  const amount = amountMatch ? Number(String(amountMatch[1]).replace(/,/g, "")) : null;

  return {
    provider,
    direction,
    amount: amount != null && Number.isFinite(amount) ? amount : null,
    currency: amount != null && Number.isFinite(amount) ? "RWF" : null,
  };
}

function mapSms(row: SmsRow) {
  return {
    id: Number(row.sms_id),
    sender: row.sender,
    body: row.body,
    receivedAt: row.received_at,
    provider: row.provider,
    amount: row.amount == null ? null : num(row.amount),
    currency: row.currency,
    direction: row.direction,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function authorizeInbound(req: { headers: Record<string, unknown>; query: Record<string, unknown>; body?: unknown }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}): boolean {
  const expected = inboundToken();
  if (!expected) {
    res.status(503).json({ error: "SMS_INBOUND_TOKEN is not configured on the server" });
    return false;
  }
  const got = extractToken(req);
  if (!got) {
    res.status(401).json({
      error: "Missing SMS token",
      hint: "Put the full webhook URL with ?token=YOUR_SMS_INBOUND_TOKEN (or send X-SMS-Token / Authorization: Bearer …).",
    });
    return false;
  }
  if (got !== expected) {
    res.status(401).json({
      error: "Invalid SMS token",
      hint: "Token does not match SMS_INBOUND_TOKEN on Render. Re-copy the secret into the URL or header.",
    });
    return false;
  }
  return true;
}

/** Shared handler — many Android forwarders use GET with query params, others POST JSON/form */
async function handleInbound(req: {
  method?: string;
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
  body?: unknown;
}, res: {
  status: (code: number) => { json: (body: unknown) => void };
  json: (body: unknown) => void;
}) {
  if (!authorizeInbound(req, res)) return;

  const bodyObj =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};

  // Some forwarders wrap fields under "data" / "sms"
  const nested =
    bodyObj.data && typeof bodyObj.data === "object" && !Array.isArray(bodyObj.data)
      ? (bodyObj.data as Record<string, unknown>)
      : bodyObj.sms && typeof bodyObj.sms === "object" && !Array.isArray(bodyObj.sms)
        ? (bodyObj.sms as Record<string, unknown>)
        : bodyObj;

  const q = req.query as Record<string, unknown>;
  const sender =
    pickString(nested, [
      "from",
      "sender",
      "phone",
      "number",
      "address",
      "originatingAddress",
      "in-number",
      "in_number",
      "inNumber",
    ]) ||
    pickString(q, [
      "from",
      "sender",
      "phone",
      "number",
      "address",
      "in-number",
      "in_number",
      "inNumber",
    ]);
  const text =
    pickString(nested, ["text", "message", "body", "content", "sms", "msg"]) ||
    pickString(q, ["text", "message", "body", "content", "sms", "msg"]);
  const receivedRaw =
    pickString(nested, ["receivedAt", "received_at", "timestamp", "date", "sentStamp", "receivedStamp", "time"]) ||
    pickString(q, ["receivedAt", "timestamp", "date", "time"]);

  // Connectivity check from apps that GET the webhook URL with only ?token=…
  if (!sender && !text) {
    res.json({
      ok: true,
      service: "barbazza-sms-inbound",
      method: String(req.method || "").toUpperCase() || "GET",
      hint: "Webhook ready. Forward SMS with from/sender + text/message (query or JSON body).",
      time: new Date().toISOString(),
    });
    return;
  }

  if (!sender || !text) {
    res.status(400).json({
      error: "sender and text are required",
      hint: "Send JSON like { from, text } or GET ?from=…&text=…&token=…",
    });
    return;
  }

  const receivedAt = parseReceivedAt(receivedRaw);
  const meta = enrichSms(sender, text);

  try {
    const rows = await query<{ sms_id: number }>(
      `INSERT INTO business_sms_messages
         (sender, body, received_at, provider, amount, currency, direction, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING sms_id`,
      [
        sender.slice(0, 80),
        text.slice(0, 4000),
        receivedAt.toISOString(),
        meta.provider,
        meta.amount,
        meta.currency,
        meta.direction,
        JSON.stringify({ method: req.method, query: req.query, body: req.body ?? null }),
      ]
    );
    res.json({ ok: true, id: Number(rows[0]?.sms_id) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not save SMS" });
  }
}

/** Public webhook for Android SMS forwarder apps (POST and GET) */
smsRoutes.post("/sms/inbound", (req, res) => {
  void handleInbound(req, res);
});
smsRoutes.get("/sms/inbound", (req, res) => {
  void handleInbound(req, res);
});

/** Lightweight ping so the phone setup can verify the token */
smsRoutes.get("/sms/inbound/ping", (req, res) => {
  if (!authorizeInbound(req, res)) return;
  res.json({
    ok: true,
    service: "barbazza-sms-inbound",
    time: new Date().toISOString(),
  });
});

smsRoutes.get("/sms", requireAuth, allow("admin"), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const provider = String(req.query.provider || "").trim();
    const unreadOnly = String(req.query.unread || "") === "1";
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(sender ILIKE $${params.length} OR body ILIKE $${params.length})`);
    }
    if (provider && provider !== "all") {
      params.push(provider);
      where.push(`provider = $${params.length}`);
    }
    if (unreadOnly) where.push(`is_read = FALSE`);

    params.push(limit);
    const rows = await query<SmsRow>(
      `SELECT sms_id, sender, body, received_at, provider, amount, currency, direction, is_read, raw_payload, created_at
       FROM business_sms_messages
       WHERE ${where.join(" AND ")}
       ORDER BY received_at DESC, sms_id DESC
       LIMIT $${params.length}`,
      params
    );

    const stats = await query<{ total: string; unread: string }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_read = FALSE)::int AS unread
       FROM business_sms_messages`
    );

    res.json({
      messages: rows.map(mapSms),
      total: num(stats[0]?.total),
      unread: num(stats[0]?.unread),
      webhookConfigured: Boolean(inboundToken()),
      webhookUrl: `${(process.env.PUBLIC_API_URL || "").replace(/\/$/, "")}/api/sms/inbound`,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load SMS" });
  }
});

smsRoutes.post("/sms/mark-read", requireAuth, allow("admin"), async (req, res) => {
  const parsed = z
    .object({
      ids: z.array(z.number().int()).optional(),
      all: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    if (parsed.data.all) {
      await query(`UPDATE business_sms_messages SET is_read = TRUE WHERE is_read = FALSE`);
    } else if (parsed.data.ids?.length) {
      await query(`UPDATE business_sms_messages SET is_read = TRUE WHERE sms_id = ANY($1::int[])`, [
        parsed.data.ids,
      ]);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not mark read" });
  }
});

smsRoutes.delete("/sms/:id", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await query(`DELETE FROM business_sms_messages WHERE sms_id = $1`, [id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not delete" });
  }
});
