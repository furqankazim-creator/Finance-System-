"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DashboardStats } from "@/types";
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<{ data: DashboardStats }>("/dashboard");
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <div>Error loading dashboard</div>;

  const { currentMonth, previousMonth, topExpenseCategories, outstandingInvoices } = stats;

  const revenueChange = previousMonth.revenueCents > 0
    ? ((currentMonth.revenueCents - previousMonth.revenueCents) / previousMonth.revenueCents) * 100
    : 0;
  const expenseChange = previousMonth.expensesCents > 0
    ? ((currentMonth.expensesCents - previousMonth.expensesCents) / previousMonth.expensesCents) * 100
    : 0;
  const profitChange = previousMonth.netProfitCents !== 0
    ? ((currentMonth.netProfitCents - previousMonth.netProfitCents) / Math.abs(previousMonth.netProfitCents)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening this month.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Current Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonth.revenueCents)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {revenueChange >= 0 ? (
                <><ArrowUpIcon className="h-3 w-3 text-green-600" /> +{revenueChange.toFixed(1)}%</>
              ) : (
                <><ArrowDownIcon className="h-3 w-3 text-red-600" /> {revenueChange.toFixed(1)}%</>
              )}
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses (Current Month)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonth.expensesCents)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {expenseChange >= 0 ? (
                <><ArrowUpIcon className="h-3 w-3 text-red-600" /> +{expenseChange.toFixed(1)}%</>
              ) : (
                <><ArrowDownIcon className="h-3 w-3 text-green-600" /> {expenseChange.toFixed(1)}%</>
              )}
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentMonth.netProfitCents < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(currentMonth.netProfitCents)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {profitChange >= 0 ? (
                <><ArrowUpIcon className="h-3 w-3 text-green-600" /> +{profitChange.toFixed(1)}%</>
              ) : (
                <><ArrowDownIcon className="h-3 w-3 text-red-600" /> {profitChange.toFixed(1)}%</>
              )}
              {" "}from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Expense Categories</CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {topExpenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses this month</p>
            ) : (
              <div className="space-y-4">
                {topExpenseCategories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium">{cat.categoryName}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(cat.totalCents)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
            <CardDescription>Awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding invoices</p>
            ) : (
              <div className="space-y-3">
                {outstandingInvoices.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(inv.amountCents)}</p>
                      <Badge variant={inv.status === "overdue" ? "destructive" : "warning"} className="text-xs">
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
