"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Kpi, Panel, Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";

type Ranking = { rank: number; barberId: number; code: string; name: string; customers: number; earned: number; share: number };
type MonthlyPoint = {
  month: string;
  label: string;
  income: number;
  customers: number;
  expenses: number;
  profit: number;
};
type Perf = {
  month: string;
  salon: { income: number; customers: number; expenses: number; profit: number; days: number; avgDaily: number };
  ranking: Ranking[];
  trend: { date: string; total: number }[];
  monthlyTrend: MonthlyPoint[];
};
type BarberPerf = {
  name: string;
  customers: number;
  earned: number;
  avg: number;
  days: number;
  trend: { date: string; total: number }[];
  monthlyTrend: { month: string; label: string; earned: number; customers: number }[];
};
type Barber = { id: number; code: string; name: string };

function shortMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export default function PerformancePage() {
  const months = useMemo(() => {
    return Array.from({ length: 24 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - index);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString("en", { month: "long", year: "numeric" });
      return { value, label };
    });
  }, []);
  const [month, setMonth] = useState(months[0].value);
  const [face, setFace] = useState<"salon" | "barber">("salon");
  const [data, setData] = useState<Perf | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState("");
  const [barber, setBarber] = useState<BarberPerf | null>(null);

  useEffect(() => {
    api<Perf>(`/api/dashboard/performance?month=${month}`).then(setData).catch(() => setData(null));
    api<Barber[]>("/api/barbers").then(setBarbers).catch(() => setBarbers([]));
  }, [month]);

  useEffect(() => {
    if (face !== "barber" || !barberId) return;
    api<BarberPerf>(`/api/dashboard/barber?month=${month}&barberId=${barberId}`).then(setBarber).catch(() => setBarber(null));
  }, [face, barberId, month]);

  return (
    <Shell>
      <Panel title="Monthly Performance Analytics" className="admin-card">
        <p style={{ fontSize: "0.9rem", color: "var(--barbazza-cream)", marginBottom: "var(--space-4)" }}>
          Select a month and switch between barbershop overview and a specific barber&apos;s monthly performance.
        </p>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label>Select Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>View</label>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <label>
                <input type="radio" checked={face === "salon"} onChange={() => setFace("salon")} /> Barbershop
              </label>
              <label>
                <input type="radio" checked={face === "barber"} onChange={() => setFace("barber")} /> Barber
              </label>
            </div>
          </div>
        </div>
      </Panel>

      {face === "salon" && data ? (
        <Panel title="Barbershop Performance" className="admin-card">
          <div className="daily-summary">
            <Kpi label="Total Customers" value={String(data.salon.customers)} />
            <Kpi label="Total Income" value={money(data.salon.income)} />
            <Kpi label="Total Expenses" value={money(data.salon.expenses)} />
            <Kpi label="Net Profit" value={money(data.salon.profit)} />
            <Kpi label="Days Worked" value={String(data.salon.days)} />
            <Kpi label="Avg Daily Income" value={money(data.salon.avgDaily)} />
          </div>

          <h4 style={{ marginTop: "var(--space-6)" }}>Performance Over Months</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--barbazza-cream)", marginBottom: "var(--space-3)" }}>
            Last 12 months ending in the selected month — income, expenses, and profit.
          </p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthlyTrend || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(10,10,10,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} width={44} />
                <Tooltip
                  formatter={(value, name) => [money(Number(value)), String(name)]}
                  labelFormatter={(label) => String(label)}
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#0a0a0a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" name="Expenses" fill="#8a8a8a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#2d5a3f"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <h4 style={{ marginTop: "var(--space-6)" }}>Income Trend - Selected Month</h4>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <XAxis dataKey="date" hide />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area dataKey="total" stroke="#0a0a0a" fill="rgba(10,10,10,0.08)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <h4 style={{ marginTop: "var(--space-6)" }}>Barber Rankings - Selected Month</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Barber</th>
                <th>Customers</th>
                <th>Earned</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((row) => (
                <tr key={row.barberId}>
                  <td>{row.rank}</td>
                  <td>
                    {row.name} ({row.code})
                  </td>
                  <td>{row.customers}</td>
                  <td>{money(row.earned)}</td>
                  <td>{row.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      {face === "barber" ? (
        <Panel title="Barber Performance" className="admin-card">
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label>Select Barber</label>
            <select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Select a barber</option>
              {barbers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </div>
          {barber ? (
            <>
              <div className="daily-summary">
                <Kpi label="Customers" value={String(barber.customers)} />
                <Kpi label="Earned" value={money(barber.earned)} />
                <Kpi label="Avg service" value={money(barber.avg)} />
                <Kpi label="Days worked" value={String(barber.days)} />
              </div>

              <h4 style={{ marginTop: "var(--space-6)" }}>Performance Over Months</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--barbazza-cream)", marginBottom: "var(--space-3)" }}>
                Last 12 months of earnings for {barber.name}.
              </p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={barber.monthlyTrend || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(10,10,10,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} width={44} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "Customers" ? [Number(value), "Customers"] : [money(Number(value)), "Earned"]
                      }
                    />
                    <Legend />
                    <Bar dataKey="earned" name="Earned" fill="#0a0a0a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Line type="monotone" dataKey="customers" name="Customers" stroke="#6a6a6a" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <h4 style={{ marginTop: "var(--space-6)" }}>Daily trend - Selected Month</h4>
              <div style={{ height: 240, marginTop: "var(--space-3)" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barber.trend}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="total" fill="#0a0a0a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : null}
        </Panel>
      ) : null}
    </Shell>
  );
}
