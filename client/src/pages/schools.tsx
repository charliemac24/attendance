import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, School, Trash2, Users } from "lucide-react";
import type { School as SchoolType } from "@shared/schema";

export default function SchoolsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSchool, setDeletingSchool] = useState<SchoolType | null>(null);
  const [editing, setEditing] = useState<SchoolType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    timezone: "Asia/Manila",
    lateTime: "08:00",
    cutoffTime: "09:00",
    smsEnabled: false,
    allowMultipleScans: false,
    smsProvider: "semaphore",
    semaphoreApiKey: "",
    semaphoreSenderName: "",
    adminUsername: "",
    adminPassword: "",
    adminFullName: "",
    adminEmail: "",
  });

  const { data: schools, isLoading } = useQuery<SchoolType[]>({
    queryKey: ["/api/schools"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: formData.name,
        timezone: formData.timezone,
        lateTime: formData.lateTime,
        cutoffTime: formData.cutoffTime,
        smsEnabled: formData.smsEnabled,
        allowMultipleScans: formData.allowMultipleScans,
        smsProvider: formData.smsProvider,
        semaphoreApiKey: formData.semaphoreApiKey,
        semaphoreSenderName: formData.semaphoreSenderName,
      };

      if (!editing) {
        payload.adminUsername = formData.adminUsername;
        payload.adminPassword = formData.adminPassword;
        payload.adminFullName = formData.adminFullName;
        payload.adminEmail = formData.adminEmail;
        await apiRequest("POST", "/api/schools", payload);
      } else {
        await apiRequest("PATCH", `/api/schools/${editing.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setDialogOpen(false);
      toast({ title: editing ? "School updated" : "School created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/schools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setDeleteDialogOpen(false);
      setDeletingSchool(null);
      toast({ title: "School deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData({
      name: "",
      timezone: "Asia/Manila",
      lateTime: "08:00",
      cutoffTime: "09:00",
      smsEnabled: false,
      allowMultipleScans: false,
      smsProvider: "semaphore",
      semaphoreApiKey: "",
      semaphoreSenderName: "",
      adminUsername: "",
      adminPassword: "",
      adminFullName: "",
      adminEmail: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (school: SchoolType) => {
    setEditing(school);
    setFormData({
      name: school.name,
      timezone: school.timezone,
      lateTime: school.lateTime?.substring(0, 5) || "08:00",
      cutoffTime: school.cutoffTime?.substring(0, 5) || "09:00",
      smsEnabled: school.smsEnabled,
      allowMultipleScans: school.allowMultipleScans,
      smsProvider: school.smsProvider,
      semaphoreApiKey: school.semaphoreApiKey || "",
      semaphoreSenderName: school.semaphoreSenderName || "",
      adminUsername: "",
      adminPassword: "",
      adminFullName: "",
      adminEmail: "",
    });
    setDialogOpen(true);
  };

  const confirmDelete = (school: SchoolType) => {
    setDeletingSchool(school);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <School className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-schools-title">Schools</h1>
            <p className="text-sm text-muted-foreground">
              Manage all schools on the platform
            </p>
          </div>
        </div>
        <Button onClick={openCreate} data-testid="button-add-school">
          <Plus className="h-4 w-4 mr-1" />
          Add School
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : schools && schools.length > 0 ? (
            <div className="divide-y">
              {schools.map((school) => (
                <div key={school.id} className="flex items-center justify-between gap-4 px-4 py-3" data-testid={`row-school-${school.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium">{school.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {school.timezone} | Late: {school.lateTime} | Cutoff: {school.cutoffTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={school.smsEnabled ? "default" : "secondary"}
                      className="no-default-hover-elevate no-default-active-elevate"
                    >
                      SMS {school.smsEnabled ? "On" : "Off"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(school)} data-testid={`button-edit-school-${school.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(school)} data-testid={`button-delete-school-${school.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <School className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No schools yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first school to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit School" : "Add School"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update school settings" : "Create a new school with admin credentials"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-school-name"
              />
            </div>

            {!editing && (
              <div className="space-y-3 p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">School Admin Account</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  These credentials will be used by the school to log in and manage their own data.
                </p>
                <div className="space-y-2">
                  <Label>Admin Username</Label>
                  <Input
                    value={formData.adminUsername}
                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                    required
                    data-testid="input-admin-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Password</Label>
                  <Input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    required
                    data-testid="input-admin-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Full Name</Label>
                  <Input
                    value={formData.adminFullName}
                    onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                    data-testid="input-admin-fullname"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    data-testid="input-admin-email"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                data-testid="input-school-timezone"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Late Time</Label>
                <Input
                  type="time"
                  value={formData.lateTime}
                  onChange={(e) => setFormData({ ...formData, lateTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cutoff Time</Label>
                <Input
                  type="time"
                  value={formData.cutoffTime}
                  onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>SMS Enabled</Label>
              <Switch
                checked={formData.smsEnabled}
                onCheckedChange={(v) => setFormData({ ...formData, smsEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>Allow Multiple Scans</Label>
              <Switch
                checked={formData.allowMultipleScans}
                onCheckedChange={(v) => setFormData({ ...formData, allowMultipleScans: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>SMS Provider</Label>
              <Input
                value={formData.smsProvider}
                onChange={(e) => setFormData({ ...formData, smsProvider: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Semaphore API Key</Label>
              <Input
                value={formData.semaphoreApiKey}
                onChange={(e) => setFormData({ ...formData, semaphoreApiKey: e.target.value })}
                type="password"
                data-testid="input-semaphore-api-key"
              />
            </div>
            <div className="space-y-2">
              <Label>Semaphore Sender Name</Label>
              <Input
                value={formData.semaphoreSenderName}
                onChange={(e) => setFormData({ ...formData, semaphoreSenderName: e.target.value })}
                data-testid="input-semaphore-sender"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-school">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingSchool?.name}</strong>? This will permanently remove all data associated with this school including students, attendance records, users, and settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSchool && deleteMutation.mutate(deletingSchool.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-school"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete School"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
