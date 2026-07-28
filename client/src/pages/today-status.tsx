import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDatabaseTime, isoDateWithOffset, localIsoDate } from "@/lib/utils";
import {
  Calendar,
  Search,
  UserCheck,
  Clock,
  AlertTriangle,
  UserX,
  HelpCircle,
  LogIn,
  LogOut,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { GradeLevel, Section } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const statusConfig: Record<string, { title: string; icon: any; description: string }> = {
  present: { title: "Checked Out Students", icon: UserCheck, description: "Students who completed check-out for the day" },
  late: { title: "Late Arrivals", icon: Clock, description: "Students who arrived late, whether still on campus or already checked out" },
  "pending-checkout": { title: "On Campus", icon: AlertTriangle, description: "Students who checked in but have not checked out yet" },
  absent: { title: "Absent Students", icon: UserX, description: "Students marked absent" },
  "not-checked-in-yet": { title: "Not Checked In Yet", icon: HelpCircle, description: "Students with no attendance record" },
};

interface StatusPageData {
  records: Array<{
    id?: number;
    studentId: number;
    studentName: string;
    studentNo: string;
    gradeLevel: string;
    section: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    guardianPhone: string | null;
    missedCheckoutYesterday?: boolean;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export default function TodayStatusPage() {
  const { user } = useAuth();
  const [, params] = useRoute("/today/:status");
  const statusKey = params?.status || "present";
  const config = statusConfig[statusKey] || statusConfig.present;
  const Icon = config.icon;

  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date") || localIsoDate();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const canManualCheckIn = ["super_admin", "school_admin", "gate_staff", "teacher"].includes(user?.role || "");
  const canManualCheckOut = ["super_admin", "school_admin", "gate_staff"].includes(user?.role || "");
  const canMarkAbsent = ["super_admin", "school_admin", "gate_staff", "teacher"].includes(user?.role || "");
  const canMarkExcused = ["super_admin", "school_admin", "gate_staff", "teacher"].includes(user?.role || "");

  const apiStatus = statusKey === "pending-checkout" ? "pending_checkout" : statusKey === "not-checked-in-yet" ? "not_checked_in" : statusKey;

  const { data, isLoading } = useQuery<StatusPageData>({
    queryKey: [
      `/api/today/${apiStatus}?date=${selectedDate}&search=${search}&grade=${gradeFilter}&section=${sectionFilter}&page=${page}`,
    ],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: gradeLevels } = useQuery<GradeLevel[]>({
    queryKey: ["/api/grade-levels"],
    refetchOnWindowFocus: true,
  });

  const { data: sections } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
    refetchOnWindowFocus: true,
  });

  const manualAction = useMutation({
    mutationFn: async ({ studentId, action }: { studentId: number; action: string }) => {
      await apiRequest("POST", "/api/attendance/manual", {
        studentId,
        action,
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith("/api/today") || key?.startsWith("/api/dashboard");
        },
      });
      toast({ title: "Action completed" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const attendanceStatusAction = useMutation({
    mutationFn: async ({
      studentId,
      status,
      date,
    }: {
      studentId: number;
      status: "absent" | "excused";
      date: string;
    }) => {
      await apiRequest("POST", "/api/attendance/status", {
        studentId,
        status,
        date,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith("/api/today") || key?.startsWith("/api/dashboard") || key?.startsWith("/api/reports");
        },
      });
      toast({ title: variables.status === "excused" ? "Student marked excused" : "Student marked absent" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const setToday = () => {
    const d = localIsoDate();
    setSelectedDate(d);
    setPage(1);
  };
  const setYesterday = () => {
    setSelectedDate(isoDateWithOffset(-1));
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-status-title">
              {config.title}
            </h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={setToday} data-testid="button-today">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={setYesterday} data-testid="button-yesterday">
            Yesterday
          </Button>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="w-auto"
              data-testid="input-date-filter"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select
              value={gradeFilter}
              onValueChange={(v) => {
                setGradeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-grade-filter">
                <SelectValue placeholder="Grade Level" />
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
            <Select
              value={sectionFilter}
              onValueChange={(v) => {
                setSectionFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-section-filter">
                <SelectValue placeholder="Section" />
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
          ) : data?.records && data.records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Grade / Section</th>
                    {statusKey !== "not-checked-in-yet" && (
                      <>
                        <th className="text-left py-3 px-4 font-medium">Check-in</th>
                        <th className="text-left py-3 px-4 font-medium">Check-out</th>
                      </>
                    )}
                    {statusKey === "not-checked-in-yet" && (
                      <th className="text-left py-3 px-4 font-medium">Guardian Phone</th>
                    )}
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record, i) => (
                    <tr key={record.studentId + "-" + i} className="border-b last:border-0" data-testid={`row-student-${record.studentId}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium">{record.studentName}</p>
                        <p className="text-xs text-muted-foreground">{record.studentNo}</p>
                        {record.missedCheckoutYesterday && (
                          <p className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            Missed check-out yesterday
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {record.gradeLevel} / {record.section || "—"}
                      </td>
                      {statusKey !== "not-checked-in-yet" && (
                        <>
                          <td className="py-3 px-4">
                            {record.checkInTime
                              ? formatDatabaseTime(record.checkInTime)
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {record.checkOutTime
                              ? formatDatabaseTime(record.checkOutTime)
                              : "—"}
                          </td>
                        </>
                      )}
                      {statusKey === "not-checked-in-yet" && (
                        <td className="py-3 px-4 text-muted-foreground">
                          {record.guardianPhone || "—"}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(statusKey === "not-checked-in-yet" ||
                            statusKey === "absent") && canManualCheckIn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                manualAction.mutate({
                                  studentId: record.studentId,
                                  action: "check_in",
                                })
                              }
                              disabled={manualAction.isPending}
                              data-testid={`button-checkin-${record.studentId}`}
                            >
                              <LogIn className="h-3 w-3 mr-1" />
                              In
                            </Button>
                          )}
                          {statusKey === "pending-checkout" && canManualCheckOut && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                manualAction.mutate({
                                  studentId: record.studentId,
                                  action: "check_out",
                                })
                              }
                              disabled={manualAction.isPending}
                              data-testid={`button-checkout-${record.studentId}`}
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              Out
                            </Button>
                          )}
                          {statusKey === "not-checked-in-yet" && canMarkAbsent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                attendanceStatusAction.mutate({
                                  studentId: record.studentId,
                                  status: "absent",
                                  date: selectedDate,
                                })
                              }
                              disabled={attendanceStatusAction.isPending}
                              data-testid={`button-absent-${record.studentId}`}
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              Absent
                            </Button>
                          )}
                          {(statusKey === "not-checked-in-yet" || statusKey === "absent") && canMarkExcused && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                attendanceStatusAction.mutate({
                                  studentId: record.studentId,
                                  status: "excused",
                                  date: selectedDate,
                                })
                              }
                              disabled={attendanceStatusAction.isPending}
                              data-testid={`button-excused-${record.studentId}`}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Excused
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * (data?.pageSize || 20)) + 1}–
            {Math.min(page * (data?.pageSize || 20), data?.total || 0)} of{" "}
            {data?.total || 0}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
