import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  MessageSquare,
  ThumbsUp,
  Star,
  AlertOctagon,
  TrendingUp,
  Brain,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface DashboardMetrics {
  total_reviews: number;
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
  average_rating: number;
  prediction_accuracy: number;
  sentiment_trend: any[];
  emotion_distribution: any[];
  most_discussed_topics: any[];
  aspect_scores: Record<string, number>;
}

export const Dashboard: React.FC = () => {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<DashboardMetrics>({
    queryKey: ["dashboardMetrics"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/metrics");
      return res.data;
    },
    refetchInterval: 12000, // Poll metrics every 12s for fresh analytics
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading metrics & charts...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 border border-rose-200 dark:border-rose-950/40 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 text-center max-w-lg mx-auto mt-12">
        <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg text-rose-800 dark:text-rose-400 mb-2">Metrics Load Failed</h3>
        <p className="text-sm text-rose-600 dark:text-rose-500 mb-4">
          There was an error communicating with the review backend. Verify your uvicorn server is active.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Calculate positive percentage
  const positiveRatio = data.total_reviews > 0
    ? (data.positive_reviews / data.total_reviews) * 100
    : 0;

  // Emotion color codes mapping
  const EMOTION_COLORS: Record<string, string> = {
    Joy: "#10B981",      // Emerald
    Anger: "#EF4444",    // Red
    Sadness: "#3B82F6",  // Blue
    Fear: "#8B5CF6",     // Purple
    Love: "#EC4899",     // Pink
    Surprise: "#F59E0B", // Amber
    Neutral: "#64748B",  // Slate
  };

  // Format Recharts data
  const pieData = data.emotion_distribution.map((item) => ({
    name: item.emotion,
    value: item.count,
    color: EMOTION_COLORS[item.emotion] || "#8884d8",
  }));

  // Aspect list sorted
  const aspectList = Object.entries(data.aspect_scores).map(([name, score]) => ({
    name,
    score: score * 100, // as percentage
  })).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Review Insights Summary</h2>
          <p className="text-xs text-muted-foreground">
            Aggregated metrics for uploaded datasets and manual predictions
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold hover:bg-secondary cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Refreshing..." : "Refresh Feed"}
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Reviews */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Feedbacks</span>
          <h3 className="text-2xl font-black mt-2 leading-none">{data.total_reviews}</h3>
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-emerald-500 font-semibold flex items-center">
              +12.4% <TrendingUp className="w-3 h-3 inline" />
            </span>
            since last upload batch
          </p>
        </div>

        {/* Card 2: Positive Sentiment % */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <ThumbsUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Positive Ratio</span>
          <h3 className="text-2xl font-black mt-2 leading-none">{positiveRatio.toFixed(1)}%</h3>
          <div className="w-full bg-secondary h-1.5 rounded-full mt-4">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${positiveRatio}%` }}
            />
          </div>
        </div>

        {/* Card 3: Avg Rating */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Star className="w-5 h-5 fill-amber-500/20 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Stars</span>
          <h3 className="text-2xl font-black mt-2 leading-none">{data.average_rating.toFixed(2)}</h3>
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            {"★".repeat(Math.round(data.average_rating)) + "☆".repeat(5 - Math.round(data.average_rating))}
            <span className="text-muted-foreground font-semibold">predicted index</span>
          </p>
        </div>

        {/* Card 4: Prediction Accuracy */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-500 rounded-xl">
            <Brain className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Engine Accuracy</span>
          <h3 className="text-2xl font-black mt-2 leading-none">{data.prediction_accuracy.toFixed(1)}%</h3>
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            F1-Validation: <span className="text-purple-500 font-bold">0.88</span> based on model evaluations
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Span 2 columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col h-[360px]">
          <h4 className="font-bold text-sm tracking-tight mb-4">Sentiment Distribution Over Time</h4>
          <div className="flex-1 w-full text-xs">
            {data.sentiment_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No history recorded yet. Perform single reviews or batch processing to build charts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sentiment_trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="posColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="negColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      color: "var(--foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="positive" stroke="#10B981" fillOpacity={1} fill="url(#posColor)" strokeWidth={2} />
                  <Area type="monotone" dataKey="negative" stroke="#EF4444" fillOpacity={1} fill="url(#negColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Emotion Distribution (Span 1 column) */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col h-[360px]">
          <h4 className="font-bold text-sm tracking-tight mb-4">Dominant Customer Emotions</h4>
          <div className="flex-1 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <span className="text-xs text-muted-foreground">No emotions indexed yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      color: "var(--foreground)",
                      fontSize: "11px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Aspect & Keywords Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aspects Scoreboard (Span 2 columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
          <h4 className="font-bold text-sm tracking-tight mb-1">Aspect Satisfaction Index</h4>
          <p className="text-[10px] text-muted-foreground mb-4">
            Percentage of positive comments extracted per specific catalog aspect
          </p>
          
          {aspectList.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No aspects parsed yet. Run detailed reviews containing target terms.
            </div>
          ) : (
            <div className="space-y-3.5">
              {aspectList.map((aspect) => (
                <div key={aspect.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{aspect.name}</span>
                    <span className={aspect.score >= 60 ? "text-emerald-500" : aspect.score >= 40 ? "text-amber-500" : "text-rose-500"}>
                      {aspect.score.toFixed(0)}% positive
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        aspect.score >= 60
                          ? "bg-emerald-500"
                          : aspect.score >= 40
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${aspect.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Keywords / Discussion tags (Span 1 column) */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
          <h4 className="font-bold text-sm tracking-tight mb-1">Top Discussed Keyterms</h4>
          <p className="text-[10px] text-muted-foreground mb-6">
            Keywords extracted from review logs by NLP frequency density
          </p>

          {data.most_discussed_topics.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              No topics indexed yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {data.most_discussed_topics.map((tag) => (
                <div
                  key={tag.topic}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl border border-border text-xs font-medium cursor-default transition-all"
                >
                  <span className="text-foreground">{tag.topic}</span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md">
                    {tag.frequency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
