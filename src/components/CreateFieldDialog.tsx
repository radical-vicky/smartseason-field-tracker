import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  crop_type: z.string().trim().min(1, "Crop type required").max(60),
  planting_date: z.string().min(1, "Planting date required"),
  location: z.string().trim().max(120).optional(),
  area_hectares: z.string().optional(),
  assigned_agent_id: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agents: { id: string; full_name: string | null; email: string | null }[];
  onCreated: () => void;
}

const CreateFieldDialog = ({ open, onOpenChange, agents, onCreated }: Props) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    crop_type: "",
    planting_date: new Date().toISOString().slice(0, 10),
    location: "",
    area_hectares: "",
    assigned_agent_id: "",
  });

  const reset = () => setForm({
    name: "", crop_type: "", planting_date: new Date().toISOString().slice(0, 10),
    location: "", area_hectares: "", assigned_agent_id: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("fields").insert({
      name: form.name.trim(),
      crop_type: form.crop_type.trim(),
      planting_date: form.planting_date,
      location: form.location.trim() || null,
      area_hectares: form.area_hectares ? Number(form.area_hectares) : null,
      assigned_agent_id: form.assigned_agent_id || null,
      created_by: user?.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Field created");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New field</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Field name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="North paddock" maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="crop">Crop type</Label>
              <Input id="crop" value={form.crop_type} onChange={(e) => setForm({ ...form, crop_type: e.target.value })} placeholder="Maize" maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Planting date</Label>
              <Input id="date" type="date" value={form.planting_date} onChange={(e) => setForm({ ...form, planting_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sector 4" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area (ha)</Label>
              <Input id="area" type="number" step="0.01" min="0" value={form.area_hectares} onChange={(e) => setForm({ ...form, area_hectares: e.target.value })} placeholder="3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign to agent</Label>
            <Select value={form.assigned_agent_id || "none"} onValueChange={(v) => setForm({ ...form, assigned_agent_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create field"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFieldDialog;
