"use client";

import { useEffect, useState } from "react";
import { BusyButton } from "@/components/BusyButton";
import { Kpi, Panel, Shell, useSession } from "@/components/Shell";
import { api, money } from "@/lib/api";

type SmsMessage = {
  id: number;
  sender: string;
  body: string;
  receivedAt: string;
  provider: string;
  amount: number | null;
  currency: string | null;
  direction: string;
  isRead: boolean;
  createdAt: string;
};

type SmsPayload = {
  messages: SmsMessage[];
  total: number;
  unread: number;
  webhookConfigured: boolean;
  webhookUrl: string;
};

const PROVIDERS = [
  { value: "all", label: "All senders" },
  { value: "mtn", label: "MTN MoMo" },
  { value: "airtel", label: "Airtel Money" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SmsInboxPage() {
  const user = useSession();
  const [data, setData] = useState<SmsPayload | null>(null);
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(true);

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (provider !== "all") params.set("provider", provider);
    if (unreadOnly) params.set("unread", "1");
    const next = await api<SmsPayload>(`/api/sms?${params.toString()}`);
    setData(next);
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      setError("Admin only.");
      setLoading(false);
      return;
    }
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load SMS"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, provider, unreadOnly]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await api("/api/sms/mark-read", { method: "POST", body: JSON.stringify({ all: true }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark read");
    } finally {
      setBusy(false);
    }
  }

  async function markOne(id: number) {
    try {
      await api("/api/sms/mark-read", { method: "POST", body: JSON.stringify({ ids: [id] }) });
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === id ? { ...m, isRead: true } : m)),
              unread: Math.max(0, prev.unread - 1),
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark read");
    }
  }

  async function removeOne(id: number) {
    if (!window.confirm("Delete this SMS from Barbazza?")) return;
    setBusy(true);
    try {
      await api(`/api/sms/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  if (user && user.role !== "admin") {
    return (
      <Shell>
        <div className="alert alert-danger">Phone SMS inbox is admin only.</div>
      </Shell>
    );
  }

  const webhookUrl = data?.webhookUrl || "https://api.thebarbazza.com/api/sms/inbound";

  return (
    <Shell loading={loading && !error}>
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="daily-summary" style={{ marginBottom: "var(--space-4)" }}>
        <Kpi label="Total SMS" value={String(data?.total ?? 0)} />
        <Kpi label="Unread" value={String(data?.unread ?? 0)} />
        <Kpi label="Webhook" value={data?.webhookConfigured ? "Ready" : "Token missing"} />
      </div>

      <Panel
        title="Phone SMS setup"
        className="admin-card"
        actions={
          <BusyButton variant="action" onClick={() => setShowSetup((v) => !v)}>
            {showSetup ? "Hide" : "Show"} setup
          </BusyButton>
        }
      >
        {showSetup ? (
          <div style={{ fontSize: "0.92rem", color: "var(--barbazza-cream)", lineHeight: 1.5 }}>
            <p style={{ marginTop: 0 }}>
              Forward transaction SMS from the <strong>business Android phone</strong> into Barbazza. The Messages app
              keeps working on the phone; copies also appear here.
            </p>
            <ol style={{ paddingLeft: "1.2rem", margin: "0 0 1rem" }}>
              <li>
                On Render → <code>barbazza-api</code> → Environment, set{" "}
                <code>SMS_INBOUND_TOKEN</code> to a long random secret, then redeploy.
              </li>
              <li>
                On the business phone, install{" "}
                <strong>SMS Forwarder</strong> or <strong>SMS to URL Forwarder</strong> (Play Store / sideload).
              </li>
              <li>
                Create a rule: forward SMS (all, or only MTN / Airtel) to this URL:
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    background: "var(--barbazza-slate)",
                    borderRadius: 10,
                    wordBreak: "break-all",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.8rem",
                  }}
                >
                  {webhookUrl}
                </div>
              </li>
              <li>
                Auth header: <code>X-SMS-Token: YOUR_SMS_INBOUND_TOKEN</code>
                <br />
                Or append <code>?token=YOUR_SMS_INBOUND_TOKEN</code> to the URL if the app has no custom headers.
              </li>
              <li>
                Method: <code>POST</code> or <code>GET</code> (both work). JSON body{" "}
                <code>{`{ "from": "+2507…", "text": "…" }`}</code>, or query{" "}
                <code>?from=…&amp;text=…&amp;token=…</code>. Most apps map sender → from and message → text.
              </li>
              <li>
                Keep the phone on Wi‑Fi/data, disable battery optimization for the forwarder, and send yourself a test
                SMS / wait for a MoMo alert.
              </li>
            </ol>
            <p style={{ marginBottom: 0 }}>
              Test ping:{" "}
              <code style={{ wordBreak: "break-all" }}>
                {webhookUrl.replace(/\/inbound$/, "/inbound/ping")}?token=YOUR_TOKEN
              </code>
            </p>
            {!data?.webhookConfigured ? (
              <div className="alert alert-danger" style={{ marginTop: 12, marginBottom: 0 }}>
                Server token not configured yet. Add <code>SMS_INBOUND_TOKEN</code> on Render before the phone can
                sync.
              </div>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--barbazza-cream)" }}>Setup steps hidden. Open again anytime.</p>
        )}
      </Panel>

      <Panel
        title="Inbox"
        className="admin-card"
        actions={
          <>
            <BusyButton variant="action" onClick={refresh} busy={busy}>
              Refresh
            </BusyButton>
            <BusyButton variant="primary" onClick={markAllRead} busy={busy} disabled={!data?.unread}>
              Mark all read
            </BusyButton>
          </>
        }
      >
        <div className="todo-toolbar" style={{ marginBottom: "var(--space-4)" }}>
          <div className="todo-search" style={{ flex: 1 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void refresh();
              }}
              placeholder="Search sender or text"
            />
          </div>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            Unread only
          </label>
        </div>

        {!data?.messages.length ? (
          <p style={{ color: "var(--barbazza-stone)" }}>
            No SMS yet. After the forwarder is set up, MoMo / bank messages will show here.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>From</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Message</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.messages.map((msg) => (
                <tr key={msg.id} style={{ fontWeight: msg.isRead ? 400 : 600 }}>
                  <td>{formatWhen(msg.receivedAt)}</td>
                  <td>{msg.sender}</td>
                  <td style={{ textTransform: "uppercase" }}>{msg.provider}</td>
                  <td>{msg.amount != null ? money(msg.amount) : "—"}</td>
                  <td style={{ whiteSpace: "normal", maxWidth: 420 }}>{msg.body}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {!msg.isRead ? (
                      <BusyButton
                        variant="action"
                        style={{ width: "auto", marginRight: 6 }}
                        onClick={() => markOne(msg.id)}
                      >
                        Read
                      </BusyButton>
                    ) : null}
                    <BusyButton variant="danger" onClick={() => removeOne(msg.id)} busy={busy}>
                      Delete
                    </BusyButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Shell>
  );
}
