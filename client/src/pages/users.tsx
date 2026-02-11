import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Plus, Edit, Trash2, Users, Shield } from "lucide-react";
import type { School } from "@shared/schema";

interface UserData {
  id: number;
  username: string;
  email: string | null;
  fullName: string;
  role: string;
  schoolId: number | null;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  gate_staff: "Gate Staff",
  teacher: "Teacher",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  school_admin: "default",
  gate_staff: "secondary",
  teacher: "outline",
};

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "teacher",
    schoolId: "",
  });

  const { data: usersList, isLoading } = useQuery<UserData[]>({
    queryKey: isSuperAdmin
      ? [`/api/users?school_id=${currentUser?.selectedSchoolId || ""}`]
      : ["/api/users"],
  });

  const { data: schools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: isSuperAdmin,
  });

  const availableRoles = isSuperAdmin
    ? ["super_admin", "school_admin", "gate_staff", "teacher"]
    : ["gate_staff", "teacher"];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        fullName: formData.fullName,
        email: formData.email || null,
        role: formData.role,
      };

      if (!editing) {
        payload.username = formData.username;
        payload.password = formData.password;
      } else if (formData.password) {
        payload.password = formData.password;
      }

      if (isSuperAdmin && formData.schoolId) {
        payload.schoolId = Number(formData.schoolId);
      }

      if (editing) {
        await apiRequest("PATCH", `/api/users/${editing.id}`, payload);
      } else {
        if (!isSuperAdmin) {
          payload.schoolId = currentUser?.schoolId;
        }
        await apiRequest("POST", "/api/users", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/users"),
      });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? "User updated" : "User created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/users"),
      });
      toast({ title: "User deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData({
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "teacher",
      schoolId: isSuperAdmin ? String(currentUser?.selectedSchoolId || "") : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (u: UserData) => {
    setEditing(u);
    setFormData({
      username: u.username,
      password: "",
      fullName: u.fullName,
      email: u.email || "",
      role: u.role,
      schoolId: u.schoolId ? String(u.schoolId) : "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-users-title">User Accounts</h1>
        </div>
        <Button onClick={openCreate} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-1" />
          Add User
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
          ) : usersList && usersList.length > 0 ? (
            <div className="divide-y">
              {usersList.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3" data-testid={`row-user-${u.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}{u.email ? ` | ${u.email}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={roleBadgeVariant[u.role] || "secondary"}
                      className="no-default-hover-elevate no-default-active-elevate"
                    >
                      {roleLabels[u.role] || u.role}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin && u.id !== currentUser?.id && (
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)} data-testid={`button-delete-user-${u.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            {!editing && (
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  data-testid="input-user-username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{editing ? "New Password (leave blank to keep current)" : "Password"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editing}
                data-testid="input-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                data-testid="input-user-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={formData.schoolId} onValueChange={(v) => setFormData({ ...formData, schoolId: v })}>
                  <SelectTrigger data-testid="select-user-school">
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-user">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
