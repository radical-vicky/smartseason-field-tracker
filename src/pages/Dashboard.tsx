import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/pages/AdminDashboard";
import AgentDashboard from "@/pages/AgentDashboard";
import { Sprout } from "lucide-react";

const Dashboard = () => {
  const { role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Sprout className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  if (role === "admin") return <AdminDashboard />;
  if (role === "agent") return <AgentDashboard />;
  return <Navigate to="/auth" replace />;
};

export default Dashboard;
