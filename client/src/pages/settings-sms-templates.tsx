import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Save } from "lucide-react";
import type { SmsTemplate } from "@shared/schema";

export default function SmsTemplatesPage() {
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<SmsTemplate> & { id: number }) => {
      await apiRequest("PATCH", `/api/sms-templates/${template.id}`, template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      toast({ title: "Template saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const typeLabels: Record<string, string> = {
    check_in: "Check-in",
    check_out: "Check-out",
    // pruned movement templates for simplicity
    late: "Late Arrival",
    absent: "Absent",
  };

  const allowedTypes = ["check_in", "check_out", "late", "absent"];
  const typeOrder = ["check_in", "check_out", "late", "absent"];
  const sortedTemplates = [...(templates || [])]
    .filter((t) => allowedTypes.includes(t.type))
    .sort((a, b) => {
      const ai = typeOrder.indexOf(a.type);
      const bi = typeOrder.indexOf(b.type);
      const ax = ai === -1 ? 999 : ai;
      const bx = bi === -1 ? 999 : bi;
      return ax - bx;
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-sms-templates-title">
            SMS Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Tokens: {"{school_name}"}, {"{student_name}"}, {"{grade_level}"}, {"{section}"}, {"{date}"}, {"{time}"}, {"{status}"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        sortedTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            label={typeLabels[template.type] || template.type}
            onSave={(data) => saveMutation.mutate({ ...data, id: template.id })}
            isSaving={saveMutation.isPending}
          />
        ))
      )}
    </div>
  );
}

function TemplateCard({
  template,
  label,
  onSave,
  isSaving,
}: {
  template: SmsTemplate;
  label: string;
  onSave: (data: Partial<SmsTemplate>) => void;
  isSaving: boolean;
}) {
  const [text, setText] = useState(template.templateText);
  const [enabled, setEnabled] = useState(template.enabled);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Badge
            variant={enabled ? "default" : "secondary"}
            className="no-default-hover-elevate no-default-active-elevate"
          >
            {enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          data-testid={`switch-template-${template.type}`}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[80px]"
          data-testid={`textarea-template-${template.type}`}
        />
        <Button
          size="sm"
          onClick={() => onSave({ templateText: text, enabled })}
          disabled={isSaving}
          data-testid={`button-save-template-${template.type}`}
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
