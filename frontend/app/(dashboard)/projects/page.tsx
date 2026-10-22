"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Project, Client } from "@/types";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", clientId: "", budget: 0, status: "active", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, cliRes] = await Promise.all([
        api.get<{ data: Project[] }>("/projects"),
        api.get<{ data: Client[] }>("/clients"),
      ]);
      setProjects(projRes.data.data);
      setClients(cliRes.data.data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/projects", formData);
      toast({ title: "Success", description: "Project created" });
      setFormData({ name: "", clientId: "", budget: 0, status: "active", description: "" });
      setOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this project?")) {
      try {
        await api.delete(`/projects/${id}`);
        toast({ title: "Success", description: "Project deleted" });
        fetchData();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  const statusColor: Record<string, string> = { active: "success", "on-hold": "warning", completed: "secondary", cancelled: "destructive" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
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
                <Label htmlFor="budget">Budget ($)</Label>
                <Input id="budget" type="number" step="0.01" value={formData.budget || ""} onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Create Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground">No projects yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((proj) => (
                  <TableRow key={proj._id}>
                    <TableCell className="font-medium">{proj.name}</TableCell>
                    <TableCell>{typeof proj.clientId === "string" ? "—" : proj.clientId.name}</TableCell>
                    <TableCell><Badge variant={statusColor[proj.status] as any}>{proj.status}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(proj.budgetCents)}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => handleDelete(proj._id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
