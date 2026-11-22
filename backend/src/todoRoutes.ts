import { Router } from "express";
import { z } from "zod";
import { allow, requireAuth } from "./auth";
import { isoDate, num, query } from "./db";

export const todoRoutes = Router();

type TodoRow = {
  todo_id: number;
  list_id: number | null;
  list_name: string | null;
  list_color: string | null;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  pinned: boolean;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ListRow = {
  list_id: number;
  name: string;
  color: string;
  sort_order: number;
  open_count: string;
};

function mapTodo(row: TodoRow) {
  return {
    id: Number(row.todo_id),
    listId: row.list_id == null ? null : Number(row.list_id),
    listName: row.list_name || null,
    listColor: row.list_color || null,
    title: row.title,
    notes: row.notes || "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ? isoDate(row.due_date) : null,
    pinned: Boolean(row.pinned),
    sortOrder: num(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const TODO_SELECT = `
  SELECT t.todo_id, t.list_id, l.name AS list_name, l.color AS list_color,
         t.title, t.notes, t.status, t.priority,
         TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
         t.pinned, t.sort_order, t.created_by, t.created_at, t.updated_at, t.completed_at
  FROM admin_todos t
  LEFT JOIN admin_todo_lists l ON l.list_id = t.list_id
`;

todoRoutes.get("/todo-lists", requireAuth, allow("admin"), async (_req, res) => {
  try {
    const rows = await query<ListRow>(
      `SELECT l.list_id, l.name, l.color, l.sort_order,
              COUNT(t.todo_id) FILTER (WHERE t.status <> 'done')::int AS open_count
       FROM admin_todo_lists l
       LEFT JOIN admin_todos t ON t.list_id = l.list_id
       GROUP BY l.list_id
       ORDER BY l.sort_order ASC, l.list_id ASC`
    );
    res.json(
      rows.map((r) => ({
        id: Number(r.list_id),
        name: r.name,
        color: r.color,
        sortOrder: num(r.sort_order),
        openCount: num(r.open_count),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load lists" });
  }
});

todoRoutes.post("/todo-lists", requireAuth, allow("admin"), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      color: z.string().trim().max(20).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "List name is required" });
    return;
  }
  try {
    const max = await query<{ m: string }>(`SELECT COALESCE(MAX(sort_order),0) AS m FROM admin_todo_lists`);
    const rows = await query<{ list_id: number }>(
      `INSERT INTO admin_todo_lists (name, color, sort_order, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING list_id`,
      [parsed.data.name, parsed.data.color || "#0a0a0a", num(max[0]?.m) + 1, req.user!.userId]
    );
    res.json({ ok: true, id: Number(rows[0]?.list_id) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not create list" });
  }
});

todoRoutes.put("/todo-lists/:id", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      color: z.string().trim().max(20).optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success || !Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid list update" });
    return;
  }
  try {
    await query(
      `UPDATE admin_todo_lists
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           sort_order = COALESCE($3, sort_order)
       WHERE list_id = $4`,
      [parsed.data.name ?? null, parsed.data.color ?? null, parsed.data.sortOrder ?? null, id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not update list" });
  }
});

todoRoutes.delete("/todo-lists/:id", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid list id" });
    return;
  }
  try {
    await query(`UPDATE admin_todos SET list_id = NULL WHERE list_id = $1`, [id]);
    await query(`DELETE FROM admin_todo_lists WHERE list_id = $1`, [id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not delete list" });
  }
});

todoRoutes.get("/todos/stats", requireAuth, allow("admin"), async (_req, res) => {
  try {
    const rows = await query<{
      open_count: string;
      done_count: string;
      today_count: string;
      overdue_count: string;
      pinned_count: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status <> 'done')::int AS open_count,
         COUNT(*) FILTER (WHERE status = 'done')::int AS done_count,
         COUNT(*) FILTER (
           WHERE status <> 'done' AND due_date = CURRENT_DATE
         )::int AS today_count,
         COUNT(*) FILTER (
           WHERE status <> 'done' AND due_date IS NOT NULL AND due_date < CURRENT_DATE
         )::int AS overdue_count,
         COUNT(*) FILTER (WHERE status <> 'done' AND pinned = TRUE)::int AS pinned_count
       FROM admin_todos`
    );
    const r = rows[0];
    res.json({
      open: num(r?.open_count),
      done: num(r?.done_count),
      dueToday: num(r?.today_count),
      overdue: num(r?.overdue_count),
      pinned: num(r?.pinned_count),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load stats" });
  }
});

todoRoutes.get("/todos", requireAuth, allow("admin"), async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const listId = req.query.listId ? Number(req.query.listId) : null;
    const priority = String(req.query.priority || "");
    const q = String(req.query.q || "").trim();
    const filter = String(req.query.filter || "");

    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (status === "pending" || status === "in_progress" || status === "done") {
      params.push(status);
      where.push(`t.status = $${params.length}`);
    } else if (status === "open") {
      where.push(`t.status <> 'done'`);
    }

    if (listId != null && Number.isFinite(listId)) {
      if (listId === 0) {
        where.push(`t.list_id IS NULL`);
      } else {
        params.push(listId);
        where.push(`t.list_id = $${params.length}`);
      }
    }

    if (priority === "low" || priority === "medium" || priority === "high" || priority === "urgent") {
      params.push(priority);
      where.push(`t.priority = $${params.length}`);
    }

    if (filter === "today") {
      where.push(`t.status <> 'done' AND t.due_date = CURRENT_DATE`);
    } else if (filter === "overdue") {
      where.push(`t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE`);
    } else if (filter === "pinned") {
      where.push(`t.pinned = TRUE AND t.status <> 'done'`);
    } else if (filter === "upcoming") {
      where.push(`t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date >= CURRENT_DATE`);
    }

    if (q) {
      params.push(`%${q}%`);
      where.push(`(t.title ILIKE $${params.length} OR COALESCE(t.notes,'') ILIKE $${params.length})`);
    }

    const rows = await query<TodoRow>(
      `${TODO_SELECT}
       WHERE ${where.join(" AND ")}
       ORDER BY
         t.pinned DESC,
         CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
         CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date ASC NULLS LAST,
         t.sort_order ASC,
         t.todo_id DESC`,
      params
    );
    res.json(rows.map(mapTodo));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load todos" });
  }
});

todoRoutes.post("/todos", requireAuth, allow("admin"), async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(240),
      notes: z.string().max(4000).optional(),
      listId: z.number().int().nullable().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      status: z.enum(["pending", "in_progress", "done"]).optional(),
      pinned: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  try {
    const max = await query<{ m: string }>(`SELECT COALESCE(MAX(sort_order),0) AS m FROM admin_todos`);
    const inserted = await query<{ todo_id: number }>(
      `INSERT INTO admin_todos (list_id, title, notes, status, priority, due_date, pinned, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING todo_id`,
      [
        parsed.data.listId ?? null,
        parsed.data.title,
        parsed.data.notes || null,
        parsed.data.status || "pending",
        parsed.data.priority || "medium",
        parsed.data.dueDate ?? null,
        parsed.data.pinned ?? false,
        num(max[0]?.m) + 1,
        req.user!.userId,
      ]
    );
    const rows = await query<TodoRow>(`${TODO_SELECT} WHERE t.todo_id = $1`, [inserted[0]?.todo_id]);
    res.json({ ok: true, todo: rows[0] ? mapTodo(rows[0]) : null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not create todo" });
  }
});

todoRoutes.put("/todos/:id", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(240).optional(),
      notes: z.string().max(4000).nullable().optional(),
      listId: z.number().int().nullable().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      status: z.enum(["pending", "in_progress", "done"]).optional(),
      pinned: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success || !Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid todo update" });
    return;
  }
  try {
    const current = await query<{ status: string }>(`SELECT status FROM admin_todos WHERE todo_id = $1`, [id]);
    if (!current[0]) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    const nextStatus = parsed.data.status;
    const markingDone = nextStatus === "done" && current[0].status !== "done";
    const reopening = nextStatus && nextStatus !== "done" && current[0].status === "done";

    await query(
      `UPDATE admin_todos
       SET title = COALESCE($1, title),
           notes = CASE WHEN $2::boolean THEN $3 ELSE notes END,
           list_id = CASE WHEN $4::boolean THEN $5 ELSE list_id END,
           priority = COALESCE($6, priority),
           due_date = CASE WHEN $7::boolean THEN $8::date ELSE due_date END,
           status = COALESCE($9, status),
           pinned = COALESCE($10, pinned),
           sort_order = COALESCE($11, sort_order),
           updated_at = CURRENT_TIMESTAMP,
           completed_at = CASE
             WHEN $12::boolean THEN CURRENT_TIMESTAMP
             WHEN $13::boolean THEN NULL
             ELSE completed_at
           END,
           completed_by = CASE
             WHEN $12::boolean THEN $14
             WHEN $13::boolean THEN NULL
             ELSE completed_by
           END
       WHERE todo_id = $15`,
      [
        parsed.data.title ?? null,
        parsed.data.notes !== undefined,
        parsed.data.notes ?? null,
        parsed.data.listId !== undefined,
        parsed.data.listId ?? null,
        parsed.data.priority ?? null,
        parsed.data.dueDate !== undefined,
        parsed.data.dueDate ?? null,
        nextStatus ?? null,
        parsed.data.pinned ?? null,
        parsed.data.sortOrder ?? null,
        markingDone,
        reopening,
        req.user!.userId,
        id,
      ]
    );
    const rows = await query<TodoRow>(`${TODO_SELECT} WHERE t.todo_id = $1`, [id]);
    res.json({ ok: true, todo: rows[0] ? mapTodo(rows[0]) : null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not update todo" });
  }
});

todoRoutes.post("/todos/:id/toggle", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid todo id" });
    return;
  }
  try {
    const current = await query<{ status: string }>(`SELECT status FROM admin_todos WHERE todo_id = $1`, [id]);
    if (!current[0]) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    const done = current[0].status === "done";
    await query(
      `UPDATE admin_todos
       SET status = $1,
           completed_at = CASE WHEN $1 = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END,
           completed_by = CASE WHEN $1 = 'done' THEN $2 ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE todo_id = $3`,
      [done ? "pending" : "done", req.user!.userId, id]
    );
    const rows = await query<TodoRow>(`${TODO_SELECT} WHERE t.todo_id = $1`, [id]);
    res.json({ ok: true, todo: rows[0] ? mapTodo(rows[0]) : null });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not toggle todo" });
  }
});

todoRoutes.delete("/todos/:id", requireAuth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid todo id" });
    return;
  }
  try {
    await query(`DELETE FROM admin_todos WHERE todo_id = $1`, [id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not delete todo" });
  }
});

todoRoutes.post("/todos/clear-completed", requireAuth, allow("admin"), async (_req, res) => {
  try {
    const rows = await query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM admin_todos WHERE status = 'done' RETURNING 1
       )
       SELECT COUNT(*)::int AS count FROM deleted`
    );
    res.json({ ok: true, removed: num(rows[0]?.count) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not clear completed" });
  }
});

todoRoutes.post("/todos/reorder", requireAuth, allow("admin"), async (req, res) => {
  const parsed = z
    .object({
      orderedIds: z.array(z.number().int()).min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "orderedIds required" });
    return;
  }
  try {
    for (let i = 0; i < parsed.data.orderedIds.length; i++) {
      await query(`UPDATE admin_todos SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE todo_id = $2`, [
        i + 1,
        parsed.data.orderedIds[i],
      ]);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not reorder" });
  }
});
