"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Panel, Shell, useSession } from "@/components/Shell";
import { api, money } from "@/lib/api";

type Credit = {
  id: number;
  amount: number;
  reason: string;
  status: string;
  requestedAt: string;
};

export default function CreditRequestPage() {
  const user = useSession();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<Credit[]>([]);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const approver =
    user?.role === "manager" ? "Admin" : user?.role === "cleaner" ? "Manager" : "Manager";

  async function load() {
    setRows(await api<Credit[]>("/api/credits?mine=1"));
  }

  useEffect(() => {
    if (!user) return;
    if (user.role === "manager") {
      router.replace("/me");
      return;
    }
    load().catch((err) => setMessage(err.message));
  }, [user, router]);

  function openCreate() {
    setAmount("");
    setReason("");
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await api("/api/credits", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason }),
      });
      setAmount("");
      setReason("");
      setFormOpen(false);
      setMessage("Request submitted.");
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      {message && !formOpen ? <p style={{ marginBottom: "var(--space-3)" }}>{message}</p> : null}
      <Panel
        title="My Credit Requests"
        className="barber-card"
        actions={
          <BusyButton variant="primary" onClick={openCreate} busy={busy && !formOpen}>
            Request Credit
          </BusyButton>
        }
      >
        <p style={{ marginBottom: "var(--space-4)", color: "var(--barbazza-cream)" }}>
          Request an advance against your salary. {approver} approval is required. Approved credits are deducted from
          your salary.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>No requests yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{money(row.amount)}</td>
                  <td>{row.reason}</td>
                  <td>{row.status}</td>
                  <td>{row.requestedAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      {formOpen ? (
        <ActionModal title="Request Emergency Credit" onClose={closeForm} busy={busy}>
          {message ? <p style={{ marginBottom: "var(--space-3)" }}>{message}</p> : null}
          <form onSubmit={onSubmit} className="service-form">
            <div className="form-group">
              <label>Amount Needed (RWF)</label>
              <input
                required
                type="number"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="form-group">
              <label>Reason for Credit Request</label>
              <textarea
                required
                rows={4}
                placeholder="Explain why you need this advance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="action-modal-footer">
              <BusyButton type="button" variant="danger" onClick={closeForm} disabled={busy}>
                Cancel
              </BusyButton>
              <BusyButton type="submit" variant="primary" busy={busy}>
                {busy ? "Submitting…" : "Submit Request"}
              </BusyButton>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
