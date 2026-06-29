import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  UploadCloud,
  FileSpreadsheet,
  FileDown,
  AlertTriangle,
  FileText,
  Trash2,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  BrainCircuit,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

interface BatchResult {
  id: number;
  review_text: string;
  sentiment: string;
  sentiment_confidence: number;
  emotion: string;
  emotion_confidence: number;
  rating_predicted: number;
  risk_score: number;
  processing_time_ms: number;
  keywords: string[];
}

const PROGRESS_STAGES = [
  "Reading File...",
  "Cleaning Data...",
  "Running NLP Models...",
  "Generating Analytics...",
  "Saving Results..."
];

const COLORS = {
  positive: "#10b981", // emerald-500
  neutral: "#f59e0b", // amber-500
  negative: "#f43f5e" // rose-500
};

export const BatchProcessing: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-advance stages during loading
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setStageIndex(() => {
          if (progress < 20) return 0;
          if (progress < 40) return 1;
          if (progress < 70) return 2;
          if (progress < 90) return 3;
          return 4;
        });
      }, 500);
    } else {
      setStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".txt")) {
      setFile(selectedFile);
      setResults(null);
    } else {
      setError("Unsupported file format. Please upload a .csv, .xlsx, or .txt file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    setLoading(true);
    setProgress(5);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dataset_name", file.name.split(".")[0]);

    // Simulate progress updates for a smoother visual experience
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return prev + Math.floor(Math.random() * 5) + 1;
        return prev;
      });
    }, 400);

    try {
      const res = await axios.post("/api/reviews/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProgress(100);
      setStageIndex(4);
      setTimeout(() => {
        setResults(res.data);
        setLoading(false);
      }, 500); // slight delay to show 100%
    } catch (err: any) {
      setError(err.response?.data?.detail || "Batch prediction upload failed. Verify file columns.");
      setLoading(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const downloadReport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      const response = await axios.get(`/api/reviews/export/${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `batch_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      console.error("Download failed:", err);
      setError("Failed to download report. Ensure you are logged in.");
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Memoized aggregations and charts data
  const {
    totalCount,
    positiveCount,
    negativeCount,
    neutralCount,
    averageRating,
    averageConfidence,
    sentimentData,
    emotionData,
    trendData,
    topKeywords,
    summaryText
  } = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        totalCount: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0,
        averageRating: 0, averageConfidence: 0,
        sentimentData: [], emotionData: [], ratingData: [], trendData: [], topKeywords: [], summaryText: ""
      };
    }

    const total = results.length;
    let pos = 0, neg = 0, neu = 0;
    let sumRating = 0, sumConf = 0;
    const emotions: Record<string, number> = {};
    const ratings: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const kwCount: Record<string, number> = {};

    results.forEach((r) => {
      if (r.sentiment === "positive") pos++;
      else if (r.sentiment === "negative") neg++;
      else neu++;

      sumRating += r.rating_predicted;
      sumConf += r.sentiment_confidence;
      
      emotions[r.emotion] = (emotions[r.emotion] || 0) + 1;
      if (ratings[r.rating_predicted] !== undefined) {
        ratings[r.rating_predicted]++;
      }
      
      r.keywords?.forEach(kw => {
        kwCount[kw] = (kwCount[kw] || 0) + 1;
      });
    });

    const sentData = [
      { name: "Positive", value: pos, color: COLORS.positive },
      { name: "Neutral", value: neu, color: COLORS.neutral },
      { name: "Negative", value: neg, color: COLORS.negative }
    ].filter(d => d.value > 0);

    const emoData = Object.entries(emotions)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const ratData = Object.entries(ratings).map(([rating, count]) => ({
      rating: `${rating} Star`,
      count
    }));

    // Generate trend data (mocked chronological by index)
    const tData = results.map((r, i) => ({
      index: i + 1,
      sentimentScore: r.sentiment === "positive" ? 1 : r.sentiment === "negative" ? -1 : 0
    }));

    const topKw = Object.entries(kwCount)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const primaryEmotion = emoData.length > 0 ? emoData[0].name : "neutral";
    const posRatio = ((pos / total) * 100).toFixed(1);
    
    const summary = `The batch processor analyzed ${total} reviews. The overall sentiment is predominantly ${
      pos > neg ? "positive" : neg > pos ? "negative" : "neutral"
    } (${posRatio}% positive). The average customer rating is ${(sumRating/total).toFixed(1)} stars. The most common emotional tone detected was "${primaryEmotion}". Keywords such as ${topKw.slice(0,3).map(k=>`"${k.word}"`).join(', ')} frequently appeared in the text, providing immediate areas for operational focus.`;

    return {
      totalCount: total,
      positiveCount: pos,
      negativeCount: neg,
      neutralCount: neu,
      averageRating: sumRating / total,
      averageConfidence: (sumConf / total) * 100,
      sentimentData: sentData,
      emotionData: emoData,
      ratingData: ratData,
      trendData: tData,
      topKeywords: topKw,
      summaryText: summary
    };
  }, [results]);

  // Table pagination and filtering
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (!searchQuery) return results;
    const lowerQ = searchQuery.toLowerCase();
    return results.filter(r => 
      r.review_text.toLowerCase().includes(lowerQ) || 
      r.emotion.toLowerCase().includes(lowerQ) ||
      r.sentiment.toLowerCase().includes(lowerQ)
    );
  }, [results, searchQuery]);

  const totalPages = Math.ceil(filteredResults.length / rowsPerPage);
  const currentTableData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredResults.slice(start, start + rowsPerPage);
  }, [filteredResults, page]);

  useEffect(() => {
    setPage(1); // Reset page on search
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Batch Review Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Upload spreadsheets of reviews to execute batch predictions and generate an interactive insights dashboard.
        </p>
      </div>

      {/* Main Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs">
            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-indigo-500/50 hover:bg-secondary/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                />
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold">Drag and drop file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, Excel spreadsheets, or plaintext review logs
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-border bg-card hover:bg-secondary rounded-xl text-xs font-bold transition-all"
                >
                  Choose File
                </button>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-5 bg-secondary/35 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate leading-tight">{file.name}</p>
                      <div className="text-[10px] text-muted-foreground mt-1 font-semibold flex items-center gap-2">
                        <span>Size: {(file.size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>Format: .{file.name.split(".").pop()}</span>
                        {results && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-500">{results.length} valid records extracted</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!loading && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setResults(null);
                        setProgress(0);
                      }}
                      className="p-2 border border-border text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {loading && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse">
                        <Activity className="w-3.5 h-3.5" />
                        {PROGRESS_STAGES[stageIndex]}
                      </span>
                      <span className="font-bold text-indigo-500">{progress}%</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/35 text-rose-600 dark:text-rose-400 text-xs font-semibold flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {file && !loading && !results && (
              <div className="mt-5">
                <button
                  onClick={handleUpload}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BrainCircuit className="w-4.5 h-4.5" />
                  Run AI Pipeline
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Column */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-fit space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            File Column Mapping
          </h4>
          <p className="text-[10px] text-muted-foreground leading-normal">
            The importer automatically scans headers to locate review text. Verify your file has at least one of these columns:
          </p>
          <div className="space-y-2 text-xs font-semibold">
            <div className="flex justify-between p-2 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">Preferred</span>
              <span className="text-indigo-500">review</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">Synonym A</span>
              <span className="text-indigo-500">review_text</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-secondary/50">
              <span className="text-muted-foreground">Synonym B</span>
              <span className="text-indigo-500">comment</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Batch sizes are capped at 100 rows per run for demo resources.
          </p>
        </div>
      </div>

      {/* DASHBOARD RESULTS */}
      {results && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pt-4">
          
          {/* Executive Summary */}
          <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <BrainCircuit className="w-32 h-32" />
            </div>
            <h3 className="font-extrabold text-lg flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Executive AI Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium relative z-10">
              {summaryText}
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Reviews</span>
              <span className="text-2xl font-black">{totalCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><ThumbsUp className="w-3 h-3"/> Positive</span>
              <span className="text-2xl font-black text-emerald-500">{positiveCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><ThumbsDown className="w-3 h-3"/> Negative</span>
              <span className="text-2xl font-black text-rose-500">{negativeCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Minus className="w-3 h-3"/> Neutral</span>
              <span className="text-2xl font-black text-amber-500">{neutralCount}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Star className="w-3 h-3"/> Avg Rating</span>
              <span className="text-2xl font-black text-indigo-500">{averageRating.toFixed(1)}</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">AI Confidence</span>
              <span className="text-2xl font-black">{averageConfidence.toFixed(0)}%</span>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-72 flex flex-col">
              <h4 className="font-bold text-sm mb-4">Sentiment Distribution</h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                      itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-72 flex flex-col col-span-1 md:col-span-2">
              <h4 className="font-bold text-sm mb-4">Emotion Tones</h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emotionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'var(--secondary)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-80 flex flex-col">
              <h4 className="font-bold text-sm mb-4">Sentiment Trend</h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="index" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} domain={[-1.2, 1.2]} ticks={[-1, 0, 1]} tickFormatter={(val) => val === 1 ? 'Pos' : val === -1 ? 'Neg' : 'Neu'} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ stroke: 'var(--border)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                    />
                    <Line type="monotone" dataKey="sentimentScore" stroke="#6366f1" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-80 flex flex-col">
              <h4 className="font-bold text-sm mb-4">Top Extract Keywords</h4>
              <div className="flex-1 overflow-hidden">
                <div className="flex flex-wrap gap-2 content-start h-full p-2">
                  {topKeywords.map((kw) => {
                    const maxCount = topKeywords[0]?.count || 1;
                    const size = Math.max(0.7, 1.5 * (kw.count / maxCount));
                    const opacity = Math.max(0.4, kw.count / maxCount);
                    return (
                      <span 
                        key={kw.word}
                        style={{ fontSize: `${size}rem`, opacity }}
                        className="font-extrabold text-indigo-500 hover:text-indigo-600 transition-colors cursor-default"
                        title={`Occurrences: ${kw.count}`}
                      >
                        {kw.word}
                      </span>
                    )
                  })}
                  {topKeywords.length === 0 && <span className="text-sm text-muted-foreground">No keywords extracted.</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Searchable Data Table */}
          <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Processed Review Logs
              </h4>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search reviews or emotions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/45 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-bold w-12">ID</th>
                    <th className="p-3 font-bold max-w-xs">Review Text</th>
                    <th className="p-3 font-bold w-24">Sentiment</th>
                    <th className="p-3 font-bold w-24">Emotion</th>
                    <th className="p-3 font-bold w-20">Rating</th>
                    <th className="p-3 font-bold w-24">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentTableData.map((row) => (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 text-muted-foreground">#{row.id}</td>
                      <td className="p-3">
                        <div className="truncate max-w-xs font-medium" title={row.review_text}>{row.review_text}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] capitalize ${
                          row.sentiment === "positive" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
                          : row.sentiment === "negative" ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400" 
                          : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        }`}>
                          {row.sentiment}
                        </span>
                      </td>
                      <td className="p-3 capitalize font-semibold text-indigo-500">{row.emotion}</td>
                      <td className="p-3">
                        <div className="flex text-amber-500">
                          {Array.from({length: 5}).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < row.rating_predicted ? "fill-amber-500" : "text-border"}`} />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[10px]">{(row.sentiment_confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {currentTableData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs italic">
                        No results found for your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-border flex justify-between items-center bg-background/50">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Showing {currentTableData.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to {Math.min(page * rowsPerPage, filteredResults.length)} of {filteredResults.length} records
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded-md border border-border hover:bg-secondary disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="p-1 rounded-md border border-border hover:bg-secondary disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Export Operations Cards */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-sm">Download Analyzed Reports</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Retrieve predictions, aspect percentages, and business logs in client-ready formats. Includes all dashboard charts and metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 border border-border rounded-xl bg-background flex flex-col justify-between h-44 hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    PDF Report
                  </span>
                </div>
                <div>
                  <h5 className="font-bold text-sm mb-1">Executive Summary</h5>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Professional multi-page PDF summarizing ratings, aspects, complaints, and recommendations.
                  </p>
                </div>
                <button
                  onClick={() => downloadReport("pdf")}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>

              <div className="p-5 border border-border rounded-xl bg-background flex flex-col justify-between h-44 hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    Excel Spread
                  </span>
                </div>
                <div>
                  <h5 className="font-bold text-sm mb-1">Detailed Logs</h5>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Complete rows of predicted scores, keyword lists, and emotion values formatted for Excel.
                  </p>
                </div>
                <button
                  onClick={() => downloadReport("xlsx")}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download XLSX
                </button>
              </div>

              <div className="p-5 border border-border rounded-xl bg-background flex flex-col justify-between h-44 hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    Comma CSV
                  </span>
                </div>
                <div>
                  <h5 className="font-bold text-sm mb-1">Structured CSV</h5>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Standard comma-separated dataset suited for processing inside local Python/R pipelines.
                  </p>
                </div>
                <button
                  onClick={() => downloadReport("csv")}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
