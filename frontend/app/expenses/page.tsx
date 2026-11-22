"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Kpi, Panel, Shell, useSession } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { shopBusinessDate } from "@/lib/time";

type Option = { id: number; name: string; code?: string };
type ExpenseRow = { category: string; description: string; amount: number; time: string; addedBy: string };
type DaySnap = {
  income: number;
  customers: number;
  expenses: number;
  profit: number;
  barberCommission: number;
  operatingExpenses: number;
  salaryExpenses: number;
  shopTakeaway: number;
  expenseRows: ExpenseRow[];
};

export default function ExpensesPage() {
  const user = useSession();
  const [categories, setCategories] = useState<Option[]>([]);
  const [barbers, setBarbers] = useState<Option[]>([]);
  const [day, setDay] = useState<DaySnap | null>(null);
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
    const snap = await api<DaySnap>(`/api/day?date=${date}`);
    setDay(snap);
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

  const rows = day?.expenseRows || [];
  const barber40 = day?.barberCommission ?? 0;
  const opsExpenses = day?.operatingExpenses ?? day?.expenses ?? 0;
  const income = day?.income ?? 0;
  const takeaway = day?.shopTakeaway ?? income - barber40 - opsExpenses;

  return (
    <Shell loading={loading && !error}>
      {error && !formOpen ? <div className="alert alert-danger">{error}</div> : null}

      <Panel title="Day money snapshot" className="manager-card">
        <p style={{ marginBottom: "var(--space-4)", color: "var(--barbazza-cream)", fontSize: "0.9rem" }}>
          Barber 40% is the commission owed from today&apos;s services. Shop take-away is income minus Barber 40% and
          operating expenses — staff salary categories are excluded.
        </p>
        <div className="daily-summary">
          <Kpi label="Income" value={money(income)} />
          <Kpi label="Barber 40%" value={money(barber40)} />
          <Kpi label="Operating expenses" value={money(opsExpenses)} />
          <Kpi label="Shop take-away" value={money(takeaway)} />
        </div>
        {(day?.salaryExpenses || 0) > 0 ? (
          <p style={{ marginTop: "var(--space-3)", fontSize: "0.8rem", color: "var(--barbazza-stone)" }}>
            Salary / payroll recorded today: {money(day!.salaryExpenses)} (excluded from take-away).
          </p>
        ) : null}
      </Panel>

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
            <tr>
              <td>Barber 40%</td>
              <td>Barber commission on today&apos;s services (auto)</td>
              <td>{money(barber40)}</td>
              <td>—</td>
              <td>System</td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No recorded expenses for this date.</td>
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
