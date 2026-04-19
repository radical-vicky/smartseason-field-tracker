import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sprout, Users, Activity, MapPin } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import hero from "@/assets/hero-fields.jpg";

const Index = () => {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-95" />
          <img
            src={hero}
            alt="Aerial view of organized farmland"
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
            loading="eager"
          />
          <div className="container relative py-24 md:py-32">
            <div className="max-w-2xl text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs backdrop-blur-sm">
                <Sprout className="h-3.5 w-3.5" />
                Field monitoring, simplified
              </div>
              <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight">
                Track every field, every stage, every season.
              </h1>
              <p className="mt-5 text-lg text-primary-foreground/90 max-w-xl">
                SmartSeason gives coordinators a clear view of crop progress and field
                agents the simplest way to log updates from the ground.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/auth?mode=signup">
                    Start monitoring <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: MapPin, title: "Field registry", desc: "Catalog fields with crop type, planting date and assigned agent." },
              { icon: Activity, title: "Stage lifecycle", desc: "Move fields through Planted, Growing, Ready and Harvested." },
              { icon: Users, title: "Roles & access", desc: "Coordinators see everything; agents focus on what's theirs." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card-soft p-6 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        SmartSeason — Field Monitoring System
      </footer>
    </div>
  );
};

export default Index;
