import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Edit, Users, Trash2 } from "lucide-react";
import type { Student, GradeLevel, Section } from "@shared/schema";

type StudentWithRelations = Student & {
  gradeLevelName?: string;
  sectionName?: string;
};

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithRelations | null>(null);
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery<StudentWithRelations[]>({
    queryKey: [`/api/students?search=${search}`],
  });

  const { data: gradeLevels } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentNo: "",
    gradeLevelId: "",
    sectionId: "",
    guardianName: "",
    guardianPhone: "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingStudent) {
        await apiRequest("PATCH", `/api/students/${editingStudent.id}`, data);
      } else {
        await apiRequest("POST", "/api/students", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/students"),
      });
      setDialogOpen(false);
      setEditingStudent(null);
      resetForm();
      toast({ title: editingStudent ? "Student updated" : "Student created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/students"),
      });
      toast({ title: "Student deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      studentNo: "",
      gradeLevelId: "",
      sectionId: "",
      guardianName: "",
      guardianPhone: "",
    });
  };

  const openEdit = (student: StudentWithRelations) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      studentNo: student.studentNo,
      gradeLevelId: String(student.gradeLevelId || ""),
      sectionId: String(student.sectionId || ""),
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingStudent(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      gradeLevelId: formData.gradeLevelId ? Number(formData.gradeLevelId) : null,
      sectionId: formData.sectionId ? Number(formData.sectionId) : null,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-students-title">Students</h1>
            <p className="text-sm text-muted-foreground">
              {students?.length ?? 0} total students
            </p>
          </div>
        </div>
        <Button onClick={openCreate} data-testid="button-add-student">
          <Plus className="h-4 w-4 mr-1" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-students"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students && students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">ID</th>
                    <th className="text-left py-3 px-4 font-medium">Grade / Section</th>
                    <th className="text-left py-3 px-4 font-medium">Guardian</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0" data-testid={`row-student-${student.id}`}>
                      <td className="py-3 px-4 font-medium">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{student.studentNo}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.gradeLevelName || "—"} / {student.sectionName || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {student.guardianPhone || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={student.isActive ? "default" : "secondary"} className="no-default-hover-elevate no-default-active-elevate">
                          {student.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(student)}
                            data-testid={`button-edit-student-${student.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(student.id)}
                            data-testid={`button-delete-student-${student.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No students found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Edit Student" : "Add Student"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Student No</Label>
              <Input
                value={formData.studentNo}
                onChange={(e) =>
                  setFormData({ ...formData, studentNo: e.target.value })
                }
                required
                data-testid="input-student-no"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select
                  value={formData.gradeLevelId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, gradeLevelId: v })
                  }
                >
                  <SelectTrigger data-testid="select-grade-level">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels?.map((gl) => (
                      <SelectItem key={gl.id} value={String(gl.id)}>
                        {gl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={formData.sectionId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, sectionId: v })
                  }
                >
                  <SelectTrigger data-testid="select-section">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input
                value={formData.guardianName}
                onChange={(e) =>
                  setFormData({ ...formData, guardianName: e.target.value })
                }
                data-testid="input-guardian-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Guardian Phone</Label>
              <Input
                value={formData.guardianPhone}
                onChange={(e) =>
                  setFormData({ ...formData, guardianPhone: e.target.value })
                }
                data-testid="input-guardian-phone"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-student">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
