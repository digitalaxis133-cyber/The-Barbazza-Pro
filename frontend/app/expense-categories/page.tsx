"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Panel, Shell, useSession } from "@/components/Shell";
import { api } from "@/lib/api";

type Category = { id: number; name: string; description: string; active: boolean };

const empty = { name: "", description: "", active: true };

export default function ExpenseCategoriesPage() {
  const user = useSession();
  const [rows, setRows] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Category[]>("/api/categories"));
  }

  useEffect(() => {
    if (!user) return;
    load().catch((err) => setError(err.message));
  }, [user]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setFormOpen(true);
  }

  function openEdit(row: Category) {
    setEditing(row);
    setForm({ name: row.name, description: row.description, active: row.active });
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
    setEditing(null);
    setForm(empty);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            active: form.active,
          }),
        });
      } else {
        await api("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name: form.name, description: form.description, active: true }),
        });
      }
      setForm(empty);
      setEditing(null);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this category?")) return;
    setBusy(true);
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      {error && !formOpen ? <div className="alert alert-danger">{error}</div> : null}
      <Panel
        title="Expense Categories"
        className="admin-card"
        actions={
          <BusyButton variant="primary" onClick={openCreate} busy={busy && !formOpen}>
            Add Category
          </BusyButton>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>No categories yet. Add one to get started.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.description || "-"}</td>
                  <td>{row.active ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <BusyButton
                      variant="action"
                      style={{ width: "auto", marginRight: 6 }}
                      onClick={() => openEdit(row)}
                      disabled={busy}
                    >
                      Edit
                    </BusyButton>
                    {row.active ? (
                      <BusyButton variant="danger" onClick={() => deactivate(row.id)} busy={busy}>
                        Delete
                      </BusyButton>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      {formOpen ? (
        <ActionModal title={editing ? `Edit ${editing.name}` : "Add Category"} onClose={closeForm} busy={busy}>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <form onSubmit={onSubmit} className="service-form">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={busy}
                />
              </div>
              {editing ? (
                <div className="form-group">
                  <label>Active</label>
                  <select
                    value={form.active ? "1" : "0"}
                    onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
                    disabled={busy}
                  >
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
              ) : null}
            </div>
            <div className="action-modal-footer">
              <BusyButton type="button" variant="danger" onClick={closeForm} disabled={busy}>
                Cancel
              </BusyButton>
              <BusyButton type="submit" variant="primary" busy={busy}>
                {busy ? "Saving…" : editing ? "Save" : "Add Category"}
              </BusyButton>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
