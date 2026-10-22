"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Expense, ExpenseCategory, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, toCents } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ vendor: "", description: "", amountCents: 0, date: "", categoryId: "", projectId: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, catRes, projRes] = await Promise.all([
        api.get<{ data: Expense[] }>("/expenses"),
        api.get<{ data: ExpenseCategory[] }>("/categories"),
        api.get<{ data: Project[] }>("/projects"),
      ]);
      setExpenses(expRes.data.data);
      setCategories(catRes.data.data);
      setProjects(projRes.data.data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = { ...formData, amountCents: toCents(formData.amountCents) };
      await api.post("/expenses", submitData);
      toast({ title: "Success", description: "Expense recorded" });
      setFormData({ vendor: "", description: "", amountCents: 0, date: "", categoryId: "", projectId: "" });
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this expense?")) {
      try {
        await api.delete(`/expenses/${id}`);
        toast({ title: "Success", description: "Expense deleted" });
        fetchData();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Record Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Input id="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amountCents || ""} onChange={(e) => setFormData({ ...formData, amountCents: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="project">Project (Optional)</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((proj) => (
                      <SelectItem key={proj._id} value={proj._id}>{proj.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Record Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp._id}>
                    <TableCell>{formatDate(exp.date)}</TableCell>
                    <TableCell className="font-medium">{exp.vendor}</TableCell>
                    <TableCell><Badge>{typeof exp.categoryId === "string" ? exp.categoryId : exp.categoryId.name}</Badge></TableCell>
                    <TableCell>{typeof exp.projectId === "string" ? "—" : exp.projectId?.name || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(exp.amountCents)}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => handleDelete(exp._id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
