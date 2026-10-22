"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PLReport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState as useFormState } from "react";

const COLORS = ["#0088fe", "#00c49f", "#ffbb28", "#ff7300", "#ff0000"];

export default function ReportsPage() {
  const [report, setReport] = useState<PLReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = dateRange.from && dateRange.to ? `?from=${dateRange.from}&to=${dateRange.to}` : "";
      const res = await api.get<{ data: PLReport }>(`/reports/pl${params}`);
      setReport(res.data.data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!report) return <div>Error loading report</div>;

  const { revenue, cogs, opex, grossProfit, netProfit, monthlyComparison } = report;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profit & Loss Report</h1>
        <p className="text-muted-foreground">Period: {formatDate(report.period.from)} — {formatDate(report.period.to)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(revenue.totalCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses (COGS + OpEx)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(cogs.totalCents + opex.totalCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(netProfit)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenueCents" fill="#10b981" name="Revenue" />
              <Bar dataKey="expensesCents" fill="#ef4444" name="Expenses" />
              <Bar dataKey="netProfitCents" fill="#3b82f6" name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>COGS Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {cogs.byCategory.length === 0 ? (
              <p className="text-muted-foreground">No COGS</p>
            ) : (
              <div className="space-y-2">
                {cogs.byCategory.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{c.categoryName}</span>
                    <span className="font-semibold">{formatCurrency(c.totalCents)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total COGS</span>
                  <span>{formatCurrency(cogs.totalCents)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Expenses Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {opex.byCategory.length === 0 ? (
              <p className="text-muted-foreground">No OpEx</p>
            ) : (
              <div className="space-y-2">
                {opex.byCategory.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{c.categoryName}</span>
                    <span className="font-semibold">{formatCurrency(c.totalCents)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total OpEx</span>
                  <span>{formatCurrency(opex.totalCents)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
