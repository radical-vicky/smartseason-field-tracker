import { computeFieldStatus, FieldStage, STATUS_LABEL } from "@/lib/fieldStatus";
import { cn } from "@/lib/utils";

interface Props {
  stage: FieldStage;
  stageChangedAt: string;
  className?: string;
}

const StatusBadge = ({ stage, stageChangedAt, className }: Props) => {
  const status = computeFieldStatus(stage, stageChangedAt);
  const styles = {
    active: "bg-status-active/10 text-status-active border-status-active/30",
    at_risk: "bg-status-risk/10 text-status-risk border-status-risk/40",
    completed: "bg-status-completed/10 text-status-completed border-status-completed/30",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
};

export default StatusBadge;
