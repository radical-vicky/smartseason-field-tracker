import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Sprout, ShieldCheck, Tractor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
  fullName: z.string().trim().max(100).optional(),
  role: z.enum(["admin", "agent"]).optional(),
});

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName || email, role },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative bg-hero items-center justify-center p-12">
        <div className="text-primary-foreground max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur-sm">
              <Sprout className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">SmartSeason</span>
          </Link>
          <h2 className="text-4xl font-bold leading-tight">
            From planting to harvest, all in one view.
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            Real-time field stages, agent updates, and risk signals — without the spreadsheets.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">SmartSeason</span>
          </Link>

          <h1 className="text-2xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup"
              ? "Pick your role to get the right view."
              : "Sign in to access your dashboard."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Mwangi"
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farm.com"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                maxLength={72}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label>I am a…</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as "admin" | "agent")}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="role-agent"
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      role === "agent" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="agent" id="role-agent" className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        <Tractor className="h-4 w-4" /> Field Agent
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Update stages & log notes
                      </div>
                    </div>
                  </label>
                  <label
                    htmlFor="role-admin"
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      role === "admin" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value="admin" id="role-admin" className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        <ShieldCheck className="h-4 w-4" /> Coordinator
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Manage fields & agents
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-center mt-6 text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
