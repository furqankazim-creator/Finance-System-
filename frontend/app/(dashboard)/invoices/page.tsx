"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Invoice, Client, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, toCents } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({ invoiceNumber: "", clientId: "", projectId: "", amountCents: 0, issueDate: "", dueDate: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, cliRes, projRes] = await Promise.all([
        api.get<{ data: Invoice[] }>("/invoices"),
        api.get<{ data: Client[] }>("/clients"),
        api.get<{ data: Project[] }>("/projects"),
      ]);
      setInvoices(invRes.data.data);
      setClients(cliRes.data.data);
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
      await api.post("/invoices", submitData);
      toast({ title: "Success", description: "Invoice created" });
      setFormData({ invoiceNumber: "", clientId: "", projectId: "", amountCents: 0, issueDate: "", dueDate: "", description: "" });
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this invoice?")) {
      try {
        await api.delete(`/invoices/${id}`);
        toast({ title: "Success", description: "Invoice deleted" });
        fetchData();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  const statusColor: Record<string, string> = { paid: "success", sent: "info", draft: "secondary", overdue: "destructive", cancelled: "outline" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="client">Client *</Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amountCents || ""} onChange={(e) => setFormData({ ...formData, amountCents: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="issueDate">Issue Date *</Label>
                  <Input id="issueDate" type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full">Create Invoice</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv._id}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell>{typeof inv.clientId === "string" ? "—" : inv.clientId.name}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell><Badge variant={statusColor[inv.status] as any}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(inv.amountCents)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(inv._id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
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
