"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Panel, Shell, useSession } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { shopBusinessDate } from "@/lib/time";

type Option = { id: number; name: string; code?: string };
type ExpenseRow = { category: string; description: string; amount: number; time: string; addedBy: string };

export default function ExpensesPage() {
  const user = useSession();
  const [categories, setCategories] = useState<Option[]>([]);
  const [barbers, setBarbers] = useState<Option[]>([]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(shopBusinessDate());
  const [form, setForm] = useState({
    categoryId: "",
    expenseType: "shop",
    barberId: "",
    description: "",
    amount: "",
    receipt: "",
  });

  async function load() {
    const day = await api<{ expenseRows: ExpenseRow[] }>(`/api/day?date=${date}`);
    setRows(day.expenseRows);
  }

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api<Option[]>("/api/categories").then(setCategories).catch(() => undefined),
      api<{ id: number; name: string; code: string }[]>("/api/barbers")
        .then((list) => setBarbers(list.map((b) => ({ id: b.id, name: `${b.name} (${b.code})` }))))
        .catch(() => undefined),
      load().catch((err) => setError(err.message)),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, date]);

  function openCreate() {
    setForm({
      categoryId: "",
      expenseType: "shop",
      barberId: "",
      description: "",
      amount: "",
      receipt: "",
    });
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          categoryId: Number(form.categoryId),
          amount: Number(form.amount),
          description: form.description,
          date,
          expenseType: form.expenseType,
          barberId: form.expenseType === "barber" && form.barberId ? Number(form.barberId) : null,
          receiptNumber: form.receipt || null,
        }),
      });
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell loading={loading && !error}>
      {error && !formOpen ? <div className="alert alert-danger">{error}</div> : null}
      <Panel
        title="Today's Expenses"
        className="manager-card"
        actions={
          <>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ minHeight: 40 }}
              disabled={busy}
            />
            <BusyButton variant="primary" onClick={openCreate} busy={busy && !formOpen}>
              Record Expense
            </BusyButton>
          </>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Time</th>
              <th>Added By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No expenses for this date.</td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.time}-${i}`}>
                  <td>{row.category}</td>
                  <td>{row.description}</td>
                  <td>{money(row.amount)}</td>
                  <td>{row.time}</td>
                  <td>{row.addedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      {formOpen ? (
        <ActionModal title="Record Expense" onClose={closeForm} busy={busy}>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <form onSubmit={onSubmit} className="service-form">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  disabled={busy}
                >
                  <option value="">Select...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={form.expenseType}
                  onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
                  disabled={busy}
                >
                  <option value="shop">Shop</option>
                  <option value="barber">Barber</option>
                </select>
              </div>
              <div className="form-group">
                <label>Barber (if applicable)</label>
                <select
                  value={form.barberId}
                  onChange={(e) => setForm({ ...form, barberId: e.target.value })}
                  disabled={busy || form.expenseType !== "barber"}
                >
                  <option value="">Select...</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="form-group">
                <label>Amount (RWF)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={100}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="form-group">
                <label>Receipt Number (Optional)</label>
                <input value={form.receipt} onChange={(e) => setForm({ ...form, receipt: e.target.value })} disabled={busy} />
              </div>
            </div>
            <div className="action-modal-footer">
              <BusyButton type="button" variant="danger" onClick={closeForm} disabled={busy}>
                Cancel
              </BusyButton>
              <BusyButton type="submit" variant="primary" busy={busy}>
                {busy ? "Saving…" : "Record Expense"}
              </BusyButton>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
