"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ExpenseCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "opex", color: "#6366f1" });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: ExpenseCategory[] }>("/categories");
      setCategories(res.data.data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/categories", formData);
      toast({ title: "Success", description: "Category created" });
      setFormData({ name: "", type: "opex", color: "#6366f1" });
      setOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this category?")) {
      try {
        await api.delete(`/categories/${id}`);
        toast({ title: "Success", description: "Category deleted" });
        fetchCategories();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expense Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cogs">COGS (Cost of Goods Sold)</SelectItem>
                    <SelectItem value="fixed">Fixed Expenses</SelectItem>
                    <SelectItem value="variable">Variable Expenses</SelectItem>
                    <SelectItem value="opex">Operating Expenses</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Create Category</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground">No categories yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat._id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell><Badge variant="outline">{cat.type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm">{cat.color}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => handleDelete(cat._id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
