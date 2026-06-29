import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ShieldAlert,
  Server,
  Activity,
  UserCheck,
  Terminal,
  Database,
  Cpu,
  RefreshCw,
} from "lucide-react";

interface HealthData {
  status: string;
  uptime_seconds: number;
  database: {
    status: string;
    dialect: string;
  };
  resources: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  environment: {
    python_version: string;
    process_id: number;
  };
}

interface ModelStatusItem {
  id: number;
  model_name: string;
  task: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  status: string;
  last_updated: string;
}

interface UserItem {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  analysis_count: number;
}

interface LogData {
  logs: string[];
}

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();

  // Redirect or block if not an administrator
  if (!isAdmin) {
    return (
      <div className="p-8 border border-rose-200 dark:border-rose-950/40 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 text-center max-w-lg mx-auto mt-16 space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-lg text-rose-800 dark:text-rose-400">Administrative Access Denied</h3>
        <p className="text-xs text-rose-600 dark:text-rose-500 leading-relaxed">
          The requested console segment requires administrator status. Please register a fresh account (first account registered defaults to admin privileges) or log in as a manager.
        </p>
      </div>
    );
  }

  // 1. Health Query
  const healthQuery = useQuery<HealthData>({
    queryKey: ["adminHealth"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/health");
      return res.data;
    },
    refetchInterval: 6000,
  });

  // 2. Models Status Query
  const modelsQuery = useQuery<ModelStatusItem[]>({
    queryKey: ["adminModels"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/model-status");
      return res.data;
    },
    refetchInterval: 8000,
  });

  // 3. User Listing Query
  const usersQuery = useQuery<UserItem[]>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/users");
      return res.data;
    },
  });

  // 4. Logs Tail Query
  const logsQuery = useQuery<LogData>({
    queryKey: ["adminLogs"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/logs");
      return res.data;
    },
    refetchInterval: 5000,
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "online":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30";
      case "loading":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 animate-pulse";
      default:
        return "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
  };

  const isAnyLoading = healthQuery.isLoading || modelsQuery.isLoading || usersQuery.isLoading || logsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Admin Console Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Track hardware load indices, SQLAlchemy transactions, model compilation status, and server stdout tails
          </p>
        </div>
        
        {isAnyLoading && (
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
        )}
      </div>

      {/* Row 1: Health & Database state */}
      {healthQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Uptime card */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Uptime Clock</span>
            <h3 className="text-2xl font-black mt-2 leading-none text-indigo-500">
              {formatUptime(healthQuery.data.uptime_seconds)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-3 font-semibold">
              Python PID: {healthQuery.data.environment.process_id}
            </p>
          </div>

          {/* CPU Load */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CPU Utilization</span>
              <Cpu className="w-4 h-4 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-black">{healthQuery.data.resources.cpu_percent.toFixed(1)}%</h3>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${healthQuery.data.resources.cpu_percent}%` }} />
            </div>
          </div>

          {/* RAM Load */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Memory Allocation</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-black">{healthQuery.data.resources.memory_percent.toFixed(1)}%</h3>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${healthQuery.data.resources.memory_percent}%` }} />
            </div>
          </div>

          {/* Database Check */}
          <div className="p-5 border border-border rounded-2xl bg-card shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Database Status</span>
              <Database className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(healthQuery.data.database.status)}`}>
              {healthQuery.data.database.status}
            </span>
            <p className="text-[10px] text-muted-foreground mt-3.5 font-semibold uppercase">
              Engine dialect: {healthQuery.data.database.dialect}
            </p>
          </div>
        </div>
      )}

      {/* Row 2: Models & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ML Pipelines status table (Span 2) */}
        <div className="lg:col-span-2 p-5 border border-border rounded-2xl bg-card shadow-xs space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            Hugging Face Pipelines Registry
          </h4>

          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-muted-foreground font-bold">
                  <th className="p-3">Model Engine Key</th>
                  <th className="p-3 w-24 text-center">Status</th>
                  <th className="p-3 w-16 text-center">Acc</th>
                  <th className="p-3 w-16 text-center">Prec</th>
                  <th className="p-3 w-16 text-center">Recall</th>
                  <th className="p-3 w-16 text-center">F1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelsQuery.data?.map((model) => (
                  <tr key={model.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 font-semibold leading-relaxed">
                      {model.model_name}
                      <span className="block text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                        Task Area: {model.task}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(model.status)}`}>
                        {model.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium text-muted-foreground">
                      {model.accuracy ? model.accuracy.toFixed(2) : "N/A"}
                    </td>
                    <td className="p-3 text-center font-medium text-muted-foreground">
                      {model.precision ? model.precision.toFixed(2) : "N/A"}
                    </td>
                    <td className="p-3 text-center font-medium text-muted-foreground">
                      {model.recall ? model.recall.toFixed(2) : "N/A"}
                    </td>
                    <td className="p-3 text-center font-medium text-muted-foreground">
                      {model.f1_score ? model.f1_score.toFixed(2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Registered Users Summary (Span 1) */}
        <div className="p-5 border border-border rounded-2xl bg-card shadow-xs space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            Registered Accounts
          </h4>

          <div className="border border-border rounded-xl overflow-hidden text-xs max-h-56 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-muted-foreground font-bold">
                  <th className="p-3">User</th>
                  <th className="p-3 w-16 text-center">Role</th>
                  <th className="p-3 w-20 text-center">Analyses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersQuery.data?.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 min-w-0">
                      <p className="font-semibold truncate leading-tight">{user.full_name}</p>
                      <p className="text-[9px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                    </td>
                    <td className="p-3 text-center uppercase font-bold text-[9px] text-muted-foreground">
                      {user.role}
                    </td>
                    <td className="p-3 text-center font-bold text-indigo-500">
                      {user.analysis_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3: Server Logs retro terminal view */}
      <div className="p-5 border border-border rounded-2xl bg-card shadow-xs space-y-3.5">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-500" />
          Server Console Log Output
        </h4>

        <div className="p-4 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] leading-relaxed shadow-inner h-60 overflow-y-auto space-y-1">
          {logsQuery.data?.logs.map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-zinc-600 select-none">[{index + 1}]</span>
              <p className="whitespace-pre-wrap">{log}</p>
            </div>
          )) || <p className="italic text-zinc-500">Tailing output stream...</p>}
        </div>
      </div>
    </div>
  );
};
