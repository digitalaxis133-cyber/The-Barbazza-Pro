"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckSquare, Pin, Plus, Search, Trash2 } from "lucide-react";
import { Kpi, Panel, Shell, useSession } from "@/components/Shell";
import { api } from "@/lib/api";
import { shopBusinessDate } from "@/lib/time";

type TodoList = { id: number; name: string; color: string; sortOrder: number; openCount: number };
type Todo = {
  id: number;
  listId: number | null;
  listName: string | null;
  listColor: string | null;
  title: string;
  notes: string;
  status: "pending" | "in_progress" | "done" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  dueDate: string | null;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
type Stats = { open: number; done: number; dueToday: number; overdue: number; pinned: number };

type FilterKey = "all" | "open" | "today" | "overdue" | "pinned" | "done";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

function priorityClass(priority: string) {
  if (priority === "urgent") return "todo-priority todo-priority-urgent";
  if (priority === "high") return "todo-priority todo-priority-high";
  if (priority === "low") return "todo-priority todo-priority-low";
  return "todo-priority todo-priority-medium";
}

function isOverdue(todo: Todo) {
  if (todo.status === "done" || !todo.dueDate) return false;
  return todo.dueDate < shopBusinessDate();
}

export default function TodoPage() {
  const user = useSession();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<Stats>({ open: 0, done: 0, dueToday: 0, overdue: 0, pinned: 0 });
  const [filter, setFilter] = useState<FilterKey>("open");
  const [listId, setListId] = useState<number | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [newListId, setNewListId] = useState<number | "">("");
  const [listName, setListName] = useState("");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams();
    if (filter === "open") params.set("status", "open");
    if (filter === "done") params.set("status", "done");
    if (filter === "today" || filter === "overdue" || filter === "pinned") params.set("filter", filter);
    if (listId !== "all") params.set("listId", String(listId));
    if (priorityFilter) params.set("priority", priorityFilter);
    if (q.trim()) params.set("q", q.trim());

    const [listRows, todoRows, nextStats] = await Promise.all([
      api<TodoList[]>("/api/todo-lists"),
      api<Todo[]>(`/api/todos?${params.toString()}`),
      api<Stats>("/api/todos/stats"),
    ]);
    setLists(listRows);
    setTodos(todoRows);
    setStats(nextStats);
    if (newListId === "" && listRows[0]) setNewListId(listRows[0].id);
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
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load todos"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter, listId, priorityFilter]);

  const visible = useMemo(() => {
    if (!q.trim()) return todos;
    const needle = q.trim().toLowerCase();
    return todos.filter(
      (t) => t.title.toLowerCase().includes(needle) || (t.notes || "").toLowerCase().includes(needle)
    );
  }, [todos, q]);

  async function refreshQuiet() {
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    }
  }

  async function addTodo(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || undefined,
          priority,
          dueDate: dueDate || null,
          listId: newListId === "" ? null : Number(newListId),
        }),
      });
      setTitle("");
      setNotes("");
      setDueDate("");
      setPriority("medium");
      setMessage("Todo added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add todo");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTodo(todo: Todo) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t
      )
    );
    try {
      await api(`/api/todos/${todo.id}/toggle`, { method: "POST" });
      await refreshQuiet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update todo");
      await refreshQuiet();
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/todos/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editing.title.trim(),
          notes: editing.notes,
          priority: editing.priority,
          dueDate: editing.dueDate,
          listId: editing.listId,
          status: editing.status,
          pinned: editing.pinned,
        }),
      });
      setEditing(null);
      setMessage("Todo updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save todo");
    } finally {
      setBusy(false);
    }
  }

  async function removeTodo(id: number) {
    if (!window.confirm("Delete this todo?")) return;
    try {
      await api(`/api/todos/${id}`, { method: "DELETE" });
      setTodos((prev) => prev.filter((t) => t.id !== id));
      await refreshQuiet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function togglePin(todo: Todo) {
    try {
      await api(`/api/todos/${todo.id}`, {
        method: "PUT",
        body: JSON.stringify({ pinned: !todo.pinned }),
      });
      await refreshQuiet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pin todo");
    }
  }

  async function clearCompleted() {
    if (!window.confirm("Remove all completed todos?")) return;
    setBusy(true);
    try {
      const result = await api<{ removed: number }>("/api/todos/clear-completed", { method: "POST" });
      setMessage(`Cleared ${result.removed} completed todo(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear completed");
    } finally {
      setBusy(false);
    }
  }

  async function addList(event: FormEvent) {
    event.preventDefault();
    if (!listName.trim()) return;
    setBusy(true);
    try {
      await api("/api/todo-lists", { method: "POST", body: JSON.stringify({ name: listName.trim() }) });
      setListName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create list");
    } finally {
      setBusy(false);
    }
  }

  async function deleteList(id: number) {
    if (!window.confirm("Delete this list? Todos stay, but become unlisted.")) return;
    try {
      await api(`/api/todo-lists/${id}`, { method: "DELETE" });
      if (listId === id) setListId("all");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete list");
    }
  }

  if (user && user.role !== "admin") {
    return (
      <Shell>
        <div className="alert alert-danger">Todo is available for admin only.</div>
      </Shell>
    );
  }

  return (
    <Shell loading={loading && !error}>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {message ? <p>{message}</p> : null}

      <div className="earnings-grid daily-summary" style={{ marginBottom: "var(--space-4)" }}>
        <Kpi label="Open" value={String(stats.open)} />
        <Kpi label="Due today" value={String(stats.dueToday)} />
        <Kpi label="Overdue" value={String(stats.overdue)} />
        <Kpi label="Done" value={String(stats.done)} />
      </div>

      <Panel title="Todo" className="admin-card">
        <p style={{ marginBottom: "var(--space-4)", color: "var(--barbazza-cream)" }}>
          Capture shop follow-ups, ops chores, and personal admin tasks. Pin what matters, set due dates, and clear
          completed when you are done.
        </p>

        <form onSubmit={addTodo} className="todo-composer">
          <div className="form-grid form-grid-2">
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Quick add</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>List</label>
              <select value={newListId} onChange={(e) => setNewListId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">No list</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
            </div>
          </div>
          <button
            type="submit"
            className={`btn-primary${busy ? " btn-processing" : ""}`}
            disabled={busy || !title.trim()}
          >
            <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {busy ? "Adding…" : "Add todo"}
          </button>
        </form>
      </Panel>

      <div className="todo-layout">
        <Panel title="Lists" className="admin-card todo-side">
          <div className="todo-filters">
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["today", "Today"],
                ["overdue", "Overdue"],
                ["pinned", "Pinned"],
                ["done", "Done"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`todo-chip ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`todo-list-btn ${listId === "all" ? "active" : ""}`}
            onClick={() => setListId("all")}
          >
            All lists
          </button>
          {lists.map((list) => (
            <div key={list.id} className="todo-list-row">
              <button
                type="button"
                className={`todo-list-btn ${listId === list.id ? "active" : ""}`}
                onClick={() => setListId(list.id)}
              >
                <span className="todo-list-dot" style={{ background: list.color }} />
                {list.name}
                <span className="todo-list-count">{list.openCount}</span>
              </button>
              <button type="button" className="btn-action-delete" onClick={() => deleteList(list.id)} title="Delete list">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <form onSubmit={addList} className="todo-list-add">
            <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="New list name" />
            <button
              type="submit"
              className={`btn-primary${busy ? " btn-processing" : ""}`}
              disabled={busy || !listName.trim()}
            >
              Add list
            </button>
          </form>
        </Panel>

        <Panel title="Tasks" className="admin-card todo-main">
          <div className="todo-toolbar">
            <div className="todo-search">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void refreshQuiet();
                }}
                placeholder="Search title or notes"
              />
            </div>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn-logout" onClick={clearCompleted} disabled={busy}>
              Clear completed
            </button>
          </div>

          {visible.length === 0 ? (
            <p style={{ color: "var(--barbazza-stone)" }}>No todos here yet. Add one above.</p>
          ) : (
            <ul className="todo-list">
              {visible.map((todo) => {
                const overdue = isOverdue(todo);
                const open = expanded === todo.id;
                return (
                  <li key={todo.id} className={`todo-item ${todo.status === "done" ? "done" : ""} ${overdue ? "overdue" : ""}`}>
                    <div className="todo-item-main">
                      <button
                        type="button"
                        className={`todo-check ${todo.status === "done" ? "checked" : ""}`}
                        onClick={() => toggleTodo(todo)}
                        aria-label={todo.status === "done" ? "Mark open" : "Mark done"}
                      >
                        {todo.status === "done" ? <CheckSquare size={18} /> : <span />}
                      </button>
                      <div className="todo-item-body">
                        <button type="button" className="todo-title-btn" onClick={() => setExpanded(open ? null : todo.id)}>
                          {todo.pinned ? <Pin size={14} className="todo-pin-icon" /> : null}
                          <span className={todo.status === "done" ? "todo-title struck" : "todo-title"}>{todo.title}</span>
                        </button>
                        <div className="todo-meta">
                          <span className={priorityClass(todo.priority)}>{todo.priority}</span>
                          {todo.listName ? (
                            <span className="todo-list-tag">
                              <span className="todo-list-dot" style={{ background: todo.listColor || "#0a0a0a" }} />
                              {todo.listName}
                            </span>
                          ) : null}
                          {todo.dueDate ? (
                            <span className={overdue ? "todo-due overdue-text" : "todo-due"}>Due {todo.dueDate}</span>
                          ) : null}
                          {todo.status === "in_progress" ? <span className="todo-due">In progress</span> : null}
                        </div>
                        {open && todo.notes ? <p className="todo-notes">{todo.notes}</p> : null}
                      </div>
                      <div className="todo-actions">
                        <button type="button" className="btn-action-edit" onClick={() => togglePin(todo)}>
                          {todo.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button type="button" className="btn-action-edit" onClick={() => setEditing({ ...todo })}>
                          Edit
                        </button>
                        <button type="button" className="btn-action-delete" onClick={() => removeTodo(todo.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {editing ? (
        <div className="todo-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="todo-modal admin-card" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h3>Edit todo</h3>
            <div className="form-group">
              <label>Title</label>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows={4}
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>List</label>
                <select
                  value={editing.listId ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, listId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">No list</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due date</label>
                <input
                  type="date"
                  value={editing.dueDate || ""}
                  onChange={(e) => setEditing({ ...editing, dueDate: e.target.value || null })}
                />
              </div>
            </div>
            <label className="todo-pin-label">
              <input
                type="checkbox"
                checked={editing.pinned}
                onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })}
              />
              Pinned
            </label>
            <div className="todo-modal-actions">
              <button type="button" className="btn-logout" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-primary${busy ? " btn-processing" : ""}`}
                disabled={busy || !editing.title.trim()}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </Shell>
  );
}
