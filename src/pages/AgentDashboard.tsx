import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import StageBadge from "@/components/StageBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeFieldStatus, FieldStage } from "@/lib/fieldStatus";
import { useAuth } from "@/hooks/useAuth";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type FieldRow = {
  id: string;
  name: string;
  crop_type: string;
  planting_date: string;
  stage: FieldStage;
  stage_changed_at: string;
  location: string | null;
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("fields")
        .select("*")
        .eq("assigned_agent_id", user.id)
        .order("stage_changed_at", { ascending: true });
      setFields((data ?? []) as FieldRow[]);
      setLoading(false);
    })();
  }, [user]);

  const counts = useMemo(() => {
    const c = { total: fields.length, active: 0, at_risk: 0, completed: 0 };
    fields.forEach((f) => c[computeFieldStatus(f.stage, f.stage_changed_at)]++);
    return c;
  }, [fields]);

  const stageData = useMemo(() => {
    const map: Record<FieldStage, number> = { planted: 0, growing: 0, ready: 0, harvested: 0 };
    fields.forEach((f) => map[f.stage]++);
    return [
      { stage: "Planted", count: map.planted, fill: "hsl(var(--secondary-foreground))" },
      { stage: "Growing", count: map.growing, fill: "hsl(var(--primary))" },
      { stage: "Ready", count: map.ready, fill: "hsl(var(--accent))" },
      { stage: "Harvested", count: map.harvested, fill: "hsl(var(--muted-foreground))" },
    ];
  }, [fields]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold">My fields</h1>
        <p className="text-muted-foreground mt-1">Update stages and log observations</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          <Tile icon={Sprout} label="Assigned" value={counts.total} tone="primary" />
          <Tile icon={Activity} label="Active" value={counts.active} tone="active" />
          <Tile icon={AlertTriangle} label="At risk" value={counts.at_risk} tone="risk" />
          <Tile icon={CheckCircle2} label="Completed" value={counts.completed} tone="completed" />
        </div>

        {fields.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Your fields by stage</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px] w-full">
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stageData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading…</div>
          ) : fields.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                No fields assigned yet. Your coordinator will assign fields to you.
              </CardContent>
            </Card>
          ) : (
            fields.map((f) => (
              <Card
                key={f.id}
                className="cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => navigate(`/fields/${f.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-lg">{f.name}</div>
                      <div className="text-sm text-muted-foreground">{f.crop_type}</div>
                    </div>
                    <StatusBadge stage={f.stage} stageChangedAt={f.stage_changed_at} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <StageBadge stage={f.stage} />
                    <span className="text-muted-foreground text-xs">
                      Planted {new Date(f.planting_date).toLocaleDateString()}
                    </span>
                  </div>
                  {f.location && (
                    <div className="mt-3 text-xs text-muted-foreground">{f.location}</div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "active" | "risk" | "completed" }) => {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    active: "bg-status-active/10 text-status-active",
    risk: "bg-status-risk/10 text-status-risk",
    completed: "bg-status-completed/10 text-status-completed",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentDashboard;
