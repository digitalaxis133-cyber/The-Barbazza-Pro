"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Panel, Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";

type Service = { id: number; name: string; price: number; description: string; active: boolean };

const empty = { name: "", price: "", description: "", active: true };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setServices(await api<Service[]>("/api/services"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      price: String(service.price),
      description: service.description,
      active: service.active,
    });
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
        await api(`/api/services/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name,
            price: Number(form.price),
            description: form.description,
            active: form.active,
          }),
        });
      } else {
        await api("/api/services", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            price: Number(form.price),
            description: form.description,
            active: true,
          }),
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
    if (!confirm("Deactivate this service?")) return;
    setBusy(true);
    try {
      await api(`/api/services/${id}`, { method: "DELETE" });
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
        title="Services"
        className="admin-card"
        actions={
          <BusyButton variant="primary" onClick={openCreate} busy={busy && !formOpen}>
            Add Service
          </BusyButton>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Description</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={5}>No services yet. Add one to get started.</td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{money(service.price)}</td>
                  <td>{service.description || "—"}</td>
                  <td>{service.active ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <BusyButton
                      variant="action"
                      style={{ width: "auto", marginRight: 6 }}
                      onClick={() => openEdit(service)}
                      disabled={busy}
                    >
                      Edit
                    </BusyButton>
                    {service.active ? (
                      <BusyButton variant="danger" onClick={() => deactivate(service.id)} busy={busy}>
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
        <ActionModal title={editing ? `Edit ${editing.name}` : "Add Service"} onClose={closeForm} busy={busy}>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <form onSubmit={onSubmit} className="service-form">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Service Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
              </div>
              <div className="form-group">
                <label>Base Price (RWF)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
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
                {busy ? "Saving…" : editing ? "Save changes" : "Add Service"}
              </BusyButton>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
