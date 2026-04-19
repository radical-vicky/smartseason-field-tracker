import { FieldStage, STAGE_LABEL } from "@/lib/fieldStatus";
import { cn } from "@/lib/utils";

const StageBadge = ({ stage, className }: { stage: FieldStage; className?: string }) => {
  const styles: Record<FieldStage, string> = {
    planted: "bg-secondary text-secondary-foreground",
    growing: "bg-primary/10 text-primary",
    ready: "bg-accent/20 text-accent-foreground",
    harvested: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", styles[stage], className)}>
      {STAGE_LABEL[stage]}
    </span>
  );
};

export default StageBadge;
