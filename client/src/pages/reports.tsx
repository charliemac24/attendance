import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Calendar, Download, ClipboardList, FileText, MessageSquare } from "lucide-react";
import { useRoute } from "wouter";
import type { GradeLevel, Section } from "@shared/schema";

interface ReportRecord {
  studentName: string;
  studentNo: string;
  gradeLevel: string;
  section: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
}

interface SmsUsageRecord {
  date: string;
  total: number;
  sent: number;
  failed: number;
  queued: number;
}

const reportConfig: Record<string, { title: string; icon: any; description: string }> = {
  daily: { title: "Daily Report", icon: ClipboardList, description: "Attendance records by date" },
  absentees: { title: "Absentee Report", icon: FileText, description: "Students absent by date range" },
  "sms-usage": { title: "SMS Usage Report", icon: MessageSquare, description: "SMS sending statistics" },
};

export default function ReportsPage() {
  const [, params] = useRoute("/reports/:type");
  const reportType = params?.type || "daily";
  const config = reportConfig[reportType] || reportConfig.daily;
  const Icon = config.icon;

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const { data: gradeLevels } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: reportData, isLoading } = useQuery<ReportRecord[] | SmsUsageRecord[]>({
    queryKey: [
      "/api/reports",
      `/${reportType}?startDate=${startDate}&endDate=${endDate}&grade=${gradeFilter}&section=${sectionFilter}`,
    ],
  });

  const handleExport = () => {
    window.open(
      `/api/reports/${reportType}/export?startDate=${startDate}&endDate=${endDate}&grade=${gradeFilter}&section=${sectionFilter}`,
      "_blank"
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-report-title">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export">
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                data-testid="input-end-date"
              />
            </div>
            {reportType !== "sms-usage" && (
              <>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeLevels?.map((gl) => (
                      <SelectItem key={gl.id} value={String(gl.id)}>
                        {gl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
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
          ) : reportType === "sms-usage" ? (
            <SmsUsageTable data={(reportData as SmsUsageRecord[]) || []} />
          ) : (
            <AttendanceTable data={(reportData as ReportRecord[]) || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceTable({ data }: { data: ReportRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No records found</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left py-3 px-4 font-medium">Student</th>
            <th className="text-left py-3 px-4 font-medium">Grade / Section</th>
            <th className="text-left py-3 px-4 font-medium">Date</th>
            <th className="text-left py-3 px-4 font-medium">Check-in</th>
            <th className="text-left py-3 px-4 font-medium">Check-out</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-3 px-4">
                <p className="font-medium">{r.studentName}</p>
                <p className="text-xs text-muted-foreground">{r.studentNo}</p>
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {r.gradeLevel} / {r.section || "—"}
              </td>
              <td className="py-3 px-4 text-muted-foreground">{r.date}</td>
              <td className="py-3 px-4">
                {r.checkInTime
                  ? new Date(r.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </td>
              <td className="py-3 px-4">
                {r.checkOutTime
                  ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmsUsageTable({ data }: { data: SmsUsageRecord[] }) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No SMS usage data found</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left py-3 px-4 font-medium">Date</th>
            <th className="text-center py-3 px-4 font-medium">Total</th>
            <th className="text-center py-3 px-4 font-medium">Sent</th>
            <th className="text-center py-3 px-4 font-medium">Failed</th>
            <th className="text-center py-3 px-4 font-medium">Queued</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-3 px-4 font-medium">{r.date}</td>
              <td className="py-3 px-4 text-center">{r.total}</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400">{r.sent}</td>
              <td className="py-3 px-4 text-center text-red-600 dark:text-red-400">{r.failed}</td>
              <td className="py-3 px-4 text-center text-muted-foreground">{r.queued}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
