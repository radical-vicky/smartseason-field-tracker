import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import StageBadge from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, Sprout, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { FieldStage, STAGE_LABEL, daysBetween, STAGE_THRESHOLD_DAYS } from "@/lib/fieldStatus";
import { z } from "zod";

type Field = {
  id: string;
  name: string;
  crop_type: string;
  planting_date: string;
  stage: FieldStage;
  stage_changed_at: string;
  assigned_agent_id: string | null;
  location: string | null;
  area_hectares: number | null;
};

type Update = {
  id: string;
  note: string | null;
  previous_stage: FieldStage | null;
  new_stage: FieldStage | null;
  created_at: string;
  author_id: string;
};

const STAGES: FieldStage[] = ["planted", "growing", "ready", "harvested"];

const FieldDetail = () => {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [field, setField] = useState<Field | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newStage, setNewStage] = useState<FieldStage>("planted");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [fRes, uRes, pRes] = await Promise.all([
      supabase.from("fields").select("*").eq("id", id).maybeSingle(),
      supabase.from("field_updates").select("*").eq("field_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    if (fRes.data) {
      setField(fRes.data as Field);
      setNewStage(fRes.data.stage as FieldStage);
    }
    setUpdates((uRes.data ?? []) as Update[]);
    const map: Record<string, string> = {};
    (pRes.data ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || "User"; });
    setProfilesMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const canEdit = field && (role === "admin" || field.assigned_agent_id === user?.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!field || !user) return;

    const noteSchema = z.string().trim().max(1000);
    const parsed = noteSchema.safeParse(note);
    if (!parsed.success) { toast.error("Note too long"); return; }
    if (newStage === field.stage && !note.trim()) {
      toast.error("Change the stage or add a note");
      return;
    }

    setSubmitting(true);
    const stageChanged = newStage !== field.stage;

    if (stageChanged) {
      const { error } = await supabase.from("fields").update({ stage: newStage }).eq("id", field.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    }

    const { error: uErr } = await supabase.from("field_updates").insert({
      field_id: field.id,
      author_id: user.id,
      note: note.trim() || null,
      previous_stage: stageChanged ? field.stage : null,
      new_stage: stageChanged ? newStage : null,
    });

    setSubmitting(false);
    if (uErr) { toast.error(uErr.message); return; }
    toast.success("Update saved");
    setNote("");
    load();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>
    </div>
  );

  if (!field) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">Field not found</div>
    </div>
  );

  const daysInStage = daysBetween(field.stage_changed_at);
  const threshold = STAGE_THRESHOLD_DAYS[field.stage];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container py-8 max-w-5xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold">{field.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <StageBadge stage={field.stage} />
              <StatusBadge stage={field.stage} stageChangedAt={field.stage_changed_at} />
              <span className="text-sm text-muted-foreground">
                {daysInStage} day{daysInStage === 1 ? "" : "s"} in stage
                {Number.isFinite(threshold) && ` (threshold ${threshold}d)`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                <Detail icon={Sprout} label="Crop" value={field.crop_type} />
                <Detail icon={Calendar} label="Planted" value={new Date(field.planting_date).toLocaleDateString()} />
                <Detail icon={MapPin} label="Location" value={field.location || "—"} />
                <Detail icon={User} label="Agent" value={field.assigned_agent_id ? (profilesMap[field.assigned_agent_id] || "Unknown") : "Unassigned"} />
                {field.area_hectares != null && (
                  <Detail icon={MapPin} label="Area" value={`${field.area_hectares} ha`} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No updates yet.</p>
                ) : (
                  <ol className="space-y-4">
                    {updates.map((u) => (
                      <li key={u.id} className="border-l-2 border-primary/30 pl-4 py-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{profilesMap[u.author_id] || "User"}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(u.created_at).toLocaleString()}
                          </span>
                        </div>
                        {u.previous_stage && u.new_stage && (
                          <div className="text-sm mt-1">
                            Stage changed:{" "}
                            <span className="font-medium">{STAGE_LABEL[u.previous_stage]}</span>{" "}
                            → <span className="font-medium">{STAGE_LABEL[u.new_stage]}</span>
                          </div>
                        )}
                        {u.note && <p className="text-sm mt-1 text-foreground/80">{u.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          {canEdit && (
            <Card className="lg:sticky lg:top-20 h-fit">
              <CardHeader><CardTitle className="text-base">Log update</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={newStage} onValueChange={(v) => setNewStage(v as FieldStage)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Note / observation</Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Pest seen on south edge…"
                      maxLength={1000}
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Saving…" : "Save update"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

const Detail = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  </div>
);

export default FieldDetail;
