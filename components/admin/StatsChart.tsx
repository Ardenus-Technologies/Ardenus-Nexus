"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";

interface StatsChartProps {
  users: { userId: string; userName: string }[];
  period: string;
}

interface SeriesEntry {
  key: string;
  color: string;
}

interface ChartData {
  days: Record<string, string | number>[];
  series: SeriesEntry[];
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  switch (period) {
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: first.toISOString().slice(0, 10),
        end: last.toISOString().slice(0, 10),
      };
    }
    case "all":
      return {
        start: "2020-01-01",
        end: now.toISOString().slice(0, 10),
      };
    case "week":
    default: {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      return {
        start: monday.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      };
    }
  }
}

const formatHours = (sec: number) => (sec / 3600).toFixed(1) + "h";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#000",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: 13 }}>
          {entry.name}: {formatHours(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function StatsChart({ users, period }: StatsChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedUser, setSelectedUser] = useState("all");
  const initialRange = getDateRange(period);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [data, setData] = useState<ChartData>({ days: [], series: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Sync date range when the period selector changes
  useEffect(() => {
    const range = getDateRange(period);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [period]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // endDate for API is exclusive, add 1 day
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      const endISO = end.toISOString().slice(0, 10);

      const params = new URLSearchParams({
        startDate,
        endDate: endISO,
      });
      if (selectedUser !== "all") {
        params.set("userId", selectedUser);
      }
      const res = await fetch(`/api/admin/stats/timeseries?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ChartComponent = chartType === "line" ? LineChart : BarChart;

  return (
    <Card hover={false}>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            <Button
              variant={chartType === "line" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              Line
            </Button>
            <Button
              variant={chartType === "bar" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              Bar
            </Button>
          </div>

          <Select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-44"
            aria-label="Filter by user"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.userName}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            aria-label="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            aria-label="End date"
          />
        </div>

        {/* Chart */}
        <div className="h-[350px]" role="img" aria-label="Team hours chart showing time tracked per user over the selected date range">
          {isLoading ? (
            <div className="h-full flex items-center justify-center" role="status">
              <p className="text-white/50 text-sm">Loading chart...</p>
            </div>
          ) : data.days.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-white/50 text-sm">No data for this range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ChartComponent data={data.days}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                />
                <YAxis
                  tickFormatter={formatHours}
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "white", fontSize: 12 }}
                />
                {data.series.map((s) =>
                  chartType === "line" ? (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: s.color }}
                      activeDot={{ r: 5 }}
                      animationDuration={500}
                    />
                  ) : (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      fill={s.color}
                      animationDuration={500}
                    />
                  )
                )}
              </ChartComponent>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
