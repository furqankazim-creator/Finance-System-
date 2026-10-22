"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Client } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState as useStateForm } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Client[] }>("/clients");
      setClients(res.data.data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load clients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, formData);
        toast({ title: "Success", description: "Client updated" });
      } else {
        await api.post("/clients", formData);
        toast({ title: "Success", description: "Client created" });
      }
      setFormData({ name: "", email: "", phone: "", company: "" });
      setEditingId(null);
      setOpen(false);
      fetchClients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await api.delete(`/clients/${id}`);
        toast({ title: "Success", description: "Client deleted" });
        fetchClients();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({ name: client.name, email: client.email || "", phone: client.phone || "", company: client.company || "" });
    setEditingId(client._id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData({ name: "", email: "", phone: "", company: "" }); }}>
              <Plus className="mr-2 h-4 w-4" /> New Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Client" : "Add New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editingId ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground">No clients yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client._id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email || "—"}</TableCell>
                    <TableCell>{client.company || "—"}</TableCell>
                    <TableCell><Badge variant={client.isActive ? "default" : "secondary"}>{client.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(client)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(client._id)}><Trash2 className="h-4 w-4" /></Button>
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
