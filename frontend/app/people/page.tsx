"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { BusyButton } from "@/components/BusyButton";
import { Panel, Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";

type UserRow = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  active: boolean;
  barberCode: string;
  commissionRate: number;
  recruitmentAdvance: number;
  advanceRemaining: number;
  alreadyPaid: number;
  monthlyDeduction: number;
  monthlySalary: number;
};

const empty = {
  username: "",
  fullName: "",
  password: "",
  role: "barber",
  email: "",
  phone: "",
  commissionRate: 40,
  recruitmentAdvance: 0,
  monthlyDeduction: 0,
  monthlySalary: 0,
};

const ROLES = ["admin", "manager", "supervisor", "barber", "cleaner"] as const;

function needsSalary(role: string) {
  return role === "manager" || role === "cleaner";
}

export default function PeoplePage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setUsers(await api<UserRow[]>("/api/users"));
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(person: UserRow) {
    setForm({ ...empty, password: "" });
    setEditing(person);
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
    setEditing(null);
    setForm(empty);
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (needsSalary(form.role) && !(Number(form.monthlySalary) > 0)) {
      setMessage("Monthly salary is required for managers and cleaners.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      setForm(empty);
      setFormOpen(false);
      setMessage("User created.");
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (needsSalary(editing.role) && !(Number(editing.monthlySalary) >= 0)) {
      setMessage("Monthly salary must be set for managers and cleaners.");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/users/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: editing.fullName,
          role: editing.role,
          email: editing.email,
          phone: editing.phone,
          active: editing.active,
          password: form.password || undefined,
          commissionRate: editing.commissionRate,
          recruitmentAdvance: editing.recruitmentAdvance,
          monthlyDeduction: editing.monthlyDeduction,
          monthlySalary: editing.monthlySalary,
        }),
      });
      setEditing(null);
      setForm(empty);
      setFormOpen(false);
      setMessage("Saved. Amount already paid was kept.");
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    setBusy(true);
    try {
      const result = await api<{ updated: number }>("/api/users/recover-advances", { method: "POST" });
      setMessage(`Recovered ${result.updated} balance${result.updated === 1 ? "" : "s"}.`);
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not recover balances");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(person: UserRow) {
    if (!confirm(`Delete / deactivate ${person.fullName}? They will no longer be able to sign in.`)) return;
    setBusy(true);
    try {
      await api(`/api/users/${person.id}`, { method: "DELETE" });
      if (editing?.id === person.id) {
        setEditing(null);
        setFormOpen(false);
      }
      setMessage("User deactivated.");
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete user");
    } finally {
      setBusy(false);
    }
  }

  const role = editing ? editing.role : form.role;

  return (
    <Shell>
      {message && !formOpen ? (
        <p style={{ marginBottom: "var(--space-3)", color: "var(--barbazza-gold)" }}>{message}</p>
      ) : null}
      <Panel
        title="Users"
        className="admin-card"
        actions={
          <>
            <BusyButton variant="action" onClick={recover} busy={busy && !formOpen}>
              Recover advances
            </BusyButton>
            <BusyButton variant="primary" onClick={openCreate} busy={busy && !formOpen}>
              Add User
            </BusyButton>
          </>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Salary</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6}>No users yet.</td>
              </tr>
            ) : (
              users.map((person) => (
                <tr key={person.id}>
                  <td>{person.fullName}</td>
                  <td>{person.username}</td>
                  <td>
                    {person.role}
                    {person.barberCode ? ` · ${person.barberCode}` : ""}
                  </td>
                  <td>{needsSalary(person.role) ? money(person.monthlySalary) : "—"}</td>
                  <td>{person.active ? "Active" : "Off"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <BusyButton
                      variant="action"
                      style={{ width: "auto", marginRight: 6 }}
                      onClick={() => openEdit(person)}
                      disabled={busy}
                    >
                      Edit
                    </BusyButton>
                    {person.active ? (
                      <BusyButton variant="danger" onClick={() => deleteUser(person)} busy={busy}>
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
        <ActionModal
          title={editing ? `Edit ${editing.username}` : "Add new user"}
          onClose={closeForm}
          busy={busy}
          wide
        >
          {message ? <p style={{ marginBottom: "var(--space-3)", color: "var(--barbazza-gold)" }}>{message}</p> : null}
          <form
            onSubmit={editing ? saveEdit : createUser}
            className="service-form"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
          >
            {!editing ? (
              <div aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
                <input type="text" name="prevent_autofill_user" autoComplete="username" tabIndex={-1} />
                <input type="password" name="prevent_autofill_pass" autoComplete="current-password" tabIndex={-1} />
              </div>
            ) : null}
            <div className="form-grid form-grid-2">
              {!editing ? (
                <div className="form-group">
                  <label>Username</label>
                  <input
                    required
                    name="barbazza_new_username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={busy}
                  />
                </div>
              ) : null}
              <div className="form-group">
                <label>Full name</label>
                <input
                  required
                  name="barbazza_full_name"
                  autoComplete="off"
                  value={editing ? editing.fullName : form.fullName}
                  onChange={(e) =>
                    editing
                      ? setEditing({ ...editing, fullName: e.target.value })
                      : setForm({ ...form, fullName: e.target.value })
                  }
                  disabled={busy}
                />
              </div>
              <div className="form-group">
                <label>{editing ? "New password (optional)" : "Password"}</label>
                <input
                  type="password"
                  name="barbazza_new_password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={role}
                  onChange={(e) =>
                    editing
                      ? setEditing({ ...editing, role: e.target.value })
                      : setForm({ ...form, role: e.target.value })
                  }
                  disabled={busy}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {role === "barber" ? (
                <>
                  <div className="form-group">
                    <label>Commission %</label>
                    <input
                      type="number"
                      value={editing ? editing.commissionRate : form.commissionRate}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        editing
                          ? setEditing({ ...editing, commissionRate: value })
                          : setForm({ ...form, commissionRate: value });
                      }}
                      disabled={busy}
                    />
                  </div>
                  <div className="form-group">
                    <label>Recruitment advance</label>
                    <input
                      type="number"
                      value={editing ? editing.recruitmentAdvance : form.recruitmentAdvance}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        editing
                          ? setEditing({ ...editing, recruitmentAdvance: value })
                          : setForm({ ...form, recruitmentAdvance: value });
                      }}
                      disabled={busy}
                    />
                  </div>
                  {editing ? (
                    <p style={{ gridColumn: "1 / -1", color: "var(--barbazza-cream)", fontSize: "0.9rem" }}>
                      Already paid {money(editing.alreadyPaid)} · remaining {money(editing.advanceRemaining)}. Changing
                      the advance keeps what was already paid.
                    </p>
                  ) : null}
                </>
              ) : null}
              {needsSalary(role) ? (
                <div className="form-group">
                  <label>Monthly salary (RWF)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={1000}
                    value={editing ? editing.monthlySalary : form.monthlySalary}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      editing
                        ? setEditing({ ...editing, monthlySalary: value })
                        : setForm({ ...form, monthlySalary: value });
                    }}
                    disabled={busy}
                  />
                </div>
              ) : null}
            </div>
            <div className="action-modal-footer">
              <BusyButton type="button" variant="danger" onClick={closeForm} disabled={busy}>
                Cancel
              </BusyButton>
              <BusyButton type="submit" variant="primary" busy={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create"}
              </BusyButton>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </Shell>
  );
}
