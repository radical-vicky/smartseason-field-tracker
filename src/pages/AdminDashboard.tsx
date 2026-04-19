import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import StageBadge from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Sprout, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeFieldStatus, FieldStage, FieldStatus } from "@/lib/fieldStatus";
import CreateFieldDialog from "@/components/CreateFieldDialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

type FieldRow = {
  id: string;
  name: string;
  crop_type: string;
  planting_date: string;
  stage: FieldStage;
  stage_changed_at: string;
  assigned_agent_id: string | null;
  location: string | null;
};

type Profile = { id: string; full_name: string | null; email: string | null };

const AdminDashboard = () => {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FieldStatus>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [fRes, pRes] = await Promise.all([
      supabase.from("fields").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setFields((fRes.data ?? []) as FieldRow[]);
    setProfiles((pRes.data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const agentName = (id: string | null) => {
    if (!id) return "—";
    const p = profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "Unknown";
  };

  const filtered = useMemo(() => {
    return fields.filter((f) => {
      const status = computeFieldStatus(f.stage, f.stage_changed_at);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search && !`${f.name} ${f.crop_type} ${f.location ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [fields, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { total: fields.length, active: 0, at_risk: 0, completed: 0 };
    fields.forEach((f) => {
      const s = computeFieldStatus(f.stage, f.stage_changed_at);
      c[s]++;
    });
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

  const statusData = useMemo(() => [
    { name: "Active", value: counts.active, fill: "hsl(var(--status-active))" },
    { name: "At Risk", value: counts.at_risk, fill: "hsl(var(--status-risk))" },
    { name: "Completed", value: counts.completed, fill: "hsl(var(--status-completed))" },
  ], [counts]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Coordinator dashboard</h1>
            <p className="text-muted-foreground mt-1">All fields across your operation</p>
          </div>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New field
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <SummaryCard icon={Sprout} label="Total fields" value={counts.total} tone="primary" />
          <SummaryCard icon={Activity} label="Active" value={counts.active} tone="active" />
          <SummaryCard icon={AlertTriangle} label="At risk" value={counts.at_risk} tone="risk" />
          <SummaryCard icon={CheckCircle2} label="Completed" value={counts.completed} tone="completed" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Fields by stage</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[220px] w-full">
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
          <Card>
            <CardHeader><CardTitle className="text-base">Status breakdown</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[220px] w-full">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex justify-center gap-4 text-xs mt-2">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">All fields</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fields…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 sm:w-64"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="at_risk">At risk</TabsTrigger>
                  <TabsTrigger value="completed">Done</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No fields match. {fields.length === 0 && "Create your first field to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Field</th>
                      <th className="py-2 pr-4 font-medium">Crop</th>
                      <th className="py-2 pr-4 font-medium">Stage</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Agent</th>
                      <th className="py-2 pr-4 font-medium">Planted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate(`/fields/${f.id}`)}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium">{f.name}</div>
                          {f.location && <div className="text-xs text-muted-foreground">{f.location}</div>}
                        </td>
                        <td className="py-3 pr-4">{f.crop_type}</td>
                        <td className="py-3 pr-4"><StageBadge stage={f.stage} /></td>
                        <td className="py-3 pr-4"><StatusBadge stage={f.stage} stageChangedAt={f.stage_changed_at} /></td>
                        <td className="py-3 pr-4">{agentName(f.assigned_agent_id)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{new Date(f.planting_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateFieldDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        agents={profiles}
        onCreated={load}
      />
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "active" | "risk" | "completed" }) => {
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

export default AdminDashboard;
