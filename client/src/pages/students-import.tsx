import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Download, FileText, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PreviewRow {
  gradeLevel: string;
  firstName: string;
  lastName: string;
  studentId: string;
  contactNumber: string;
  normalizedPhone: string;
  status: "ok" | "error";
  errors: string[];
  section?: string;
}

interface PreviewResult {
  rows: PreviewRow[];
  validCount: number;
  errorCount: number;
}

export default function StudentsImportPage() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/students/import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data: PreviewResult) => {
      setPreview(data);
    },
    onError: (err: any) => {
      toast({ title: "Upload Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const validRows = preview?.rows.filter((r) => r.status === "ok") || [];
      await apiRequest("POST", "/api/students/import/confirm", { rows: validRows });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/students"),
      });
      toast({ title: "Import completed successfully" });
      setPreview(null);
    },
    onError: (err: any) => {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const downloadTemplate = () => {
    const csv = "Grade Level,First Name,Last Name,Student ID,Contact Number\nGrade 1,Juan,Dela Cruz,2025-001,09171234567\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-import-title">Import Students</h1>
          <p className="text-sm text-muted-foreground">
            Bulk import students from a CSV file
          </p>
        </div>
      </div>

      {!preview ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Required columns: Grade Level, First Name, Last Name, Student ID, Contact Number
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploadMutation.isPending ? "Processing..." : "Select CSV File"}
                </Button>
                <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                  <Download className="h-4 w-4 mr-1" />
                  Download Template
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <Card className="flex-1 min-w-[150px]">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{preview.validCount}</p>
                  <p className="text-xs text-muted-foreground">Valid rows</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[150px]">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{preview.errorCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <h3 className="text-sm font-semibold">Import Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreview(null)}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => confirmMutation.mutate()}
                  disabled={preview.validCount === 0 || confirmMutation.isPending}
                  data-testid="button-confirm-import"
                >
                  {confirmMutation.isPending ? "Importing..." : `Import ${preview.validCount} Students`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Grade Level</th>
                      <th className="text-left py-3 px-4 font-medium">First Name</th>
                      <th className="text-left py-3 px-4 font-medium">Last Name</th>
                      <th className="text-left py-3 px-4 font-medium">Student ID</th>
                      <th className="text-left py-3 px-4 font-medium">Contact</th>
                      <th className="text-left py-3 px-4 font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className={`border-b last:border-0 ${row.status === "error" ? "bg-red-50/50 dark:bg-red-950/10" : ""}`}>
                        <td className="py-3 px-4">
                          <Badge
                            variant={row.status === "ok" ? "default" : "destructive"}
                            className="no-default-hover-elevate no-default-active-elevate"
                          >
                            {row.status === "ok" ? "OK" : "Error"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{row.gradeLevel}</td>
                        <td className="py-3 px-4">{row.firstName}</td>
                        <td className="py-3 px-4">{row.lastName}</td>
                        <td className="py-3 px-4">{row.studentId}</td>
                        <td className="py-3 px-4">{row.normalizedPhone || row.contactNumber}</td>
                        <td className="py-3 px-4 text-red-600 dark:text-red-400 text-xs">
                          {row.errors.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
