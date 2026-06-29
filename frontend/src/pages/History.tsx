import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Search,
  Trash2,
  Eye,
  FileDown,
  AlertOctagon,
  RefreshCw,
  X,
  Star,
} from "lucide-react";

interface AspectDetail {
  sentiment: string;
  score: number;
}

interface AnalysisItem {
  id: number;
  review_text: string;
  sentiment: string;
  sentiment_confidence: number;
  emotion: string;
  emotion_confidence: number;
  rating_predicted: number;
  summary_short: string;
  summary_detailed: string;
  insights: {
    key_complaints: string[];
    key_praises: string[];
    recommendations: string[];
  };
  fake_probability: number;
  bot_probability: number;
  risk_score: number;
  keywords: string[];
  aspect_sentiment: Record<string, AspectDetail>;
  explanation_data: { word: string; score: number }[];
  processing_time_ms: number;
  source_dataset: string;
  created_at: string;
}

export const History: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [emotion, setEmotion] = useState("");
  const [rating, setRating] = useState("");
  const [selectedItem, setSelectedItem] = useState<AnalysisItem | null>(null);

  // Pagination states
  const [skip, setSkip] = useState(0);
  const limit = 15;

  const { data, isLoading, isError } = useQuery<AnalysisItem[]>({
    queryKey: ["historyLogs", skip, search, sentiment, emotion, rating],
    queryFn: async () => {
      const params: Record<string, any> = {
        skip,
        limit,
      };
      if (search) params.search = search;
      if (sentiment) params.sentiment = sentiment;
      if (emotion) params.emotion = emotion;
      if (rating) params.rating = parseInt(rating);

      const res = await axios.get("/api/reviews/history", { params });
      return res.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/reviews/analysis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historyLogs"] });
      if (selectedItem) setSelectedItem(null);
    },
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this analysis record?")) {
      deleteMutation.mutate(id);
    }
  };

  const getWordHighlightClass = (score: number) => {
    if (score > 0.15) {
      return "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-indigo-900/30";
    } else if (score < -0.15) {
      return "bg-rose-100 dark:bg-rose-950/45 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/30";
    }
    return "text-foreground border-transparent";
  };

  const downloadExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      const response = await axios.get(`/api/reviews/export/${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `history_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      console.error("Export failed:", err);
      alert("Failed to download export. Ensure you are logged in.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Prediction Logs Registry</h2>
          <p className="text-xs text-muted-foreground">
            Search, filter, and audit past predictions and export structured summaries
          </p>
        </div>

        {/* Exports */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card text-xs font-bold hover:bg-secondary rounded-xl cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> PDF Report
          </button>
          <button
            onClick={() => downloadExport("xlsx")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card text-xs font-bold hover:bg-secondary rounded-xl cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => downloadExport("csv")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card text-xs font-bold hover:bg-secondary rounded-xl cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSkip(0);
            }}
            placeholder="Search reviews..."
            className="w-full pl-9 pr-3 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none"
          />
        </div>

        {/* Sentiment filter */}
        <select
          value={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value);
            setSkip(0);
          }}
          className="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none font-semibold text-muted-foreground"
        >
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        {/* Emotion filter */}
        <select
          value={emotion}
          onChange={(e) => {
            setEmotion(e.target.value);
            setSkip(0);
          }}
          className="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none font-semibold text-muted-foreground"
        >
          <option value="">All Emotions</option>
          <option value="joy">Joy</option>
          <option value="anger">Anger</option>
          <option value="sadness">Sadness</option>
          <option value="fear">Fear</option>
          <option value="love">Love</option>
          <option value="surprise">Surprise</option>
        </select>

        {/* Rating filter */}
        <select
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setSkip(0);
          }}
          className="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs focus:outline-none font-semibold text-muted-foreground"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
          <span className="text-xs text-muted-foreground animate-pulse">Retrieving prediction history...</span>
        </div>
      ) : isError || !data ? (
        <div className="p-8 border border-border rounded-xl text-center">
          <AlertOctagon className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h5 className="font-bold text-sm text-foreground">History Query Failed</h5>
          <p className="text-xs text-muted-foreground mt-1">Failed to contact uvicorn API endpoint.</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 border border-border rounded-2xl bg-card text-center text-muted-foreground text-xs">
          No matching review logs found. Refine your filters or upload a database spreadsheet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/45 border-b border-border text-muted-foreground font-bold">
                    <th className="p-4 w-28">Date</th>
                    <th className="p-4 w-28">Rating</th>
                    <th className="p-4">Review Text</th>
                    <th className="p-4 w-24">Sentiment</th>
                    <th className="p-4 w-24">Emotion</th>
                    <th className="p-4 w-24">Risk Index</th>
                    <th className="p-4 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-secondary/20 cursor-pointer transition-colors"
                    >
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < item.rating_predicted ? "fill-amber-500 text-amber-500" : "text-border"
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 max-w-sm truncate">
                        <span className="font-semibold">{item.review_text}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap capitalize">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.sentiment === "positive" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" : item.sentiment === "negative" ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400" : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        }`}>
                          {item.sentiment}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap capitalize text-indigo-500 font-semibold">
                        {item.emotion}
                      </td>
                      <td className="p-4 whitespace-nowrap font-medium text-muted-foreground">
                        {(item.risk_score * 100).toFixed(0)}%
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                            className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer hover:bg-secondary"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1.5 border border-border rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simple Pagination Footer */}
          <div className="flex justify-between items-center text-xs">
            <button
              onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
              disabled={skip === 0}
              className="px-3 py-1.5 border border-border bg-card rounded-xl hover:bg-secondary disabled:opacity-50 cursor-pointer"
            >
              Previous Page
            </button>
            <span className="font-semibold text-muted-foreground">
              Showing logs {skip + 1} - {skip + data.length}
            </span>
            <button
              onClick={() => setSkip((prev) => prev + limit)}
              disabled={data.length < limit}
              className="px-3 py-1.5 border border-border bg-card rounded-xl hover:bg-secondary disabled:opacity-50 cursor-pointer"
            >
              Next Page
            </button>
          </div>
        </div>
      )}

      {/* Details Inspector Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedItem(null)}
          />
          {/* Panel */}
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  Review Log #{selectedItem.id}
                </span>
                <h3 className="font-bold text-base leading-tight">Inspect AI Prediction Details</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body content grid */}
            <div className="space-y-6">
              
              {/* Row 1: Word Highlights heatmap */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Text Token Weightings heatmap
                </span>
                <div className="p-4 rounded-xl border border-border bg-background/50 flex flex-wrap gap-x-1.5 gap-y-2.5 leading-relaxed text-xs">
                  {selectedItem.explanation_data?.map((item, index) => (
                    <div
                      key={index}
                      className={`px-1.5 py-0.5 rounded-md border text-xs font-semibold select-none ${getWordHighlightClass(item.score)}`}
                    >
                      {item.word}
                    </div>
                  )) || <p className="italic text-muted-foreground">Explainability maps not computed for this review.</p>}
                </div>
              </div>

              {/* Row 2: Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 border border-border rounded-xl bg-secondary/30 text-center">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Sentiment Class</span>
                  <p className="text-sm font-bold capitalize mt-1 text-indigo-500">{selectedItem.sentiment}</p>
                </div>
                <div className="p-4 border border-border rounded-xl bg-secondary/30 text-center">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Stars rating</span>
                  <div className="flex justify-center gap-0.5 mt-1.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < selectedItem.rating_predicted ? "fill-amber-500 text-amber-500" : "text-border"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4 border border-border rounded-xl bg-secondary/30 text-center">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Emotion Tone</span>
                  <p className="text-sm font-bold capitalize mt-1 text-indigo-500">{selectedItem.emotion}</p>
                </div>
                <div className="p-4 border border-border rounded-xl bg-secondary/30 text-center">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Processing latency</span>
                  <p className="text-sm font-bold mt-1 text-indigo-500">{selectedItem.processing_time_ms} ms</p>
                </div>
              </div>

              {/* Row 3: Summarization & Business Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Summary */}
                <div className="p-4 border border-border rounded-xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">AI Summarization</span>
                  <div className="space-y-2.5 text-xs leading-relaxed">
                    <p className="font-semibold text-foreground bg-secondary/50 p-2.5 rounded-lg border border-border">
                      {selectedItem.summary_short}
                    </p>
                    <p className="text-muted-foreground">{selectedItem.summary_detailed}</p>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-4 border border-border rounded-xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Actionable recommendations</span>
                  <ul className="list-decimal pl-4 text-xs space-y-1.5 text-foreground leading-normal font-semibold">
                    {selectedItem.insights?.recommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    )) || <li>No custom insights extracted.</li>}
                  </ul>
                </div>
              </div>

              {/* Row 4: Aspects & Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Aspects */}
                <div className="col-span-2 p-4 border border-border rounded-xl space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aspect Sentiment Ratios</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {Object.entries(selectedItem.aspect_sentiment || {}).map(([aspect, data]) => (
                      <div
                        key={aspect}
                        className={`p-2 rounded-lg border ${
                          data.sentiment === "positive"
                            ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/35 text-emerald-600 dark:text-emerald-400"
                            : data.sentiment === "negative"
                            ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/35 text-rose-600 dark:text-rose-400"
                            : "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/35 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <p className="text-[9px] font-bold uppercase truncate">{aspect}</p>
                        <p className="font-extrabold capitalize mt-0.5">{data.sentiment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div className="p-4 border border-border rounded-xl space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extracted tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.keywords?.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 bg-secondary text-muted-foreground border border-border text-[10px] font-bold rounded-md"
                      >
                        {kw}
                      </span>
                    )) || <span className="italic text-muted-foreground text-xs">None</span>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
