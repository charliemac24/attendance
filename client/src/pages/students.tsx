import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Edit, Users, Trash2, Printer, X } from "lucide-react";
import QRCode from "qrcode";
import type { Student, GradeLevel, Section } from "@shared/schema";

type StudentWithRelations = Student & {
  gradeLevelName?: string;
  sectionName?: string;
};

type PrintableStudent = {
  firstName: string;
  lastName: string;
  studentNo: string;
  qrToken: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function toPrintableItems(students: PrintableStudent[]) {
  return Promise.all(
    students.map(async (student) => ({
      fullName: `${student.firstName} ${student.lastName}`,
      studentNo: student.studentNo,
      qrDataUrl: await QRCode.toDataURL(student.qrToken, {
        width: 220,
        margin: 1,
      }),
    })),
  );
}

function openPrintWindowShell(title: string): Window {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup was blocked by browser");
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 24px;">
        Preparing printable QR codes...
      </body>
    </html>
  `);
  printWindow.document.close();
  return printWindow;
}

function renderPrintWindow(
  printWindow: Window,
  title: string,
  items: Array<{ fullName: string; studentNo: string; qrDataUrl: string }>,
) {
  const cards = items
    .map(
      (item) => `
    <div class="card">
      <img src="${item.qrDataUrl}" alt="QR code for ${escapeHtml(item.fullName)}" />
      <div class="name">${escapeHtml(item.fullName)}</div>
      <div class="id">ID: ${escapeHtml(item.studentNo)}</div>
    </div>
  `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { font-family: Arial, sans-serif; margin: 0; color: #111; }
          .header { margin: 0 0 8px; padding: 0 4mm; }
          .title { font-size: 16px; font-weight: 700; margin: 0; }
          .subtitle { font-size: 11px; color: #555; margin: 3px 0 0; }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8mm;
            padding: 0 4mm 8mm;
          }
          .card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 6mm 4mm;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .card img { width: 48mm; height: 48mm; display: block; margin: 0 auto 6mm; }
          .name { font-size: 12px; font-weight: 600; margin-bottom: 3px; }
          .id { font-size: 11px; color: #444; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="title">${escapeHtml(title)}</p>
          <p class="subtitle">Generated ${new Date().toLocaleString()}</p>
        </div>
        <div class="grid">${cards}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 200);
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentWithRelations | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentWithRelations | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
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
    photoUrl: "",
    isActive: true,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl("");
      return;
    }
    const localUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [photoFile]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let uploadedPhotoUrl: string | null = null;
      if (photoFile) {
        const body = new FormData();
        body.append("photo", photoFile);
        const uploadRes = await fetch("/api/students/photo", {
          method: "POST",
          body,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const text = (await uploadRes.text()) || "Photo upload failed";
          throw new Error(text);
        }
        const uploadData = await uploadRes.json();
        uploadedPhotoUrl = uploadData.photoUrl;
      }

      const payload = {
        ...data,
        photoUrl:
          uploadedPhotoUrl ??
          (data.photoUrl === "" ? null : data.photoUrl || null),
        isActive: Boolean(data.isActive),
      };

      if (editingStudent) {
        await apiRequest("PATCH", `/api/students/${editingStudent.id}`, payload);
      } else {
        await apiRequest("POST", "/api/students", payload);
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
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      toast({ title: "Student deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmDelete = (student: StudentWithRelations) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      studentNo: "",
      gradeLevelId: "",
      sectionId: "",
      guardianName: "",
      guardianPhone: "",
      photoUrl: "",
      isActive: true,
    });
    setPhotoFile(null);
    setPhotoPreviewUrl("");
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
      photoUrl: student.photoUrl || "",
      isActive: student.isActive,
    });
    setPhotoFile(null);
    setPhotoPreviewUrl("");
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

  const printStudents = async (targetStudents: PrintableStudent[], title: string) => {
    if (targetStudents.length === 0) {
      toast({ title: "No students to print", description: "Adjust filters or add students first." });
      return;
    }

    try {
      setIsPrinting(true);
      const printWindow = openPrintWindowShell(title);
      const printable = await toPrintableItems(targetStudents);
      renderPrintWindow(printWindow, title, printable);
    } catch (err: any) {
      toast({
        title: "QR print failed",
        description: err?.message || "Unable to generate QR codes for printing.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              printStudents(
                (students || []).map((s) => ({
                  firstName: s.firstName,
                  lastName: s.lastName,
                  studentNo: s.studentNo,
                  qrToken: s.qrToken,
                })),
                `Student QR Codes (${students?.length || 0})`,
              )
            }
            disabled={isPrinting || isLoading || !students?.length}
            data-testid="button-print-all-qr"
          >
            <Printer className="h-4 w-4 mr-1" />
            {isPrinting ? "Preparing..." : "Print Filtered QR"}
          </Button>
          <Button onClick={openCreate} data-testid="button-add-student">
            <Plus className="h-4 w-4 mr-1" />
            Add Student
          </Button>
        </div>
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
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={student.photoUrl || ""} alt={`${student.firstName} ${student.lastName}`} />
                            <AvatarFallback>
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{student.firstName} {student.lastName}</span>
                        </div>
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
                            onClick={() =>
                              printStudents(
                                [
                                  {
                                    firstName: student.firstName,
                                    lastName: student.lastName,
                                    studentNo: student.studentNo,
                                    qrToken: student.qrToken,
                                  },
                                ],
                                `Student QR Code - ${student.firstName} ${student.lastName}`,
                              )
                            }
                            disabled={isPrinting}
                            data-testid={`button-print-student-qr-${student.id}`}
                            title="Print student QR"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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
                            onClick={() => confirmDelete(student)}
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
              <Label>Student Photo</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={
                      photoPreviewUrl || formData.photoUrl || ""
                    }
                    alt="Student photo preview"
                  />
                  <AvatarFallback>
                    {formData.firstName?.[0] || "S"}
                    {formData.lastName?.[0] || "T"}
                  </AvatarFallback>
                </Avatar>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                  }}
                  data-testid="input-student-photo"
                />
                {(photoFile || formData.photoUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPhotoFile(null);
                      setFormData({ ...formData, photoUrl: "" });
                    }}
                    title="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
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
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{studentToDelete?.firstName} {studentToDelete?.lastName}</strong>
              {" "}({studentToDelete?.studentNo})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => studentToDelete && deleteMutation.mutate(studentToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-student"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
