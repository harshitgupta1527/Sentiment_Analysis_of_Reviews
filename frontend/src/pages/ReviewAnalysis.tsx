import React, { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Star,
  Brain,
  Layers,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

interface AspectDetail {
  sentiment: string;
  score: number;
  breakdown: Record<string, number>;
}

interface AnalysisResult {
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
}

export const ReviewAnalysis: React.FC = () => {
  const [text, setText] = useState("");
  const [source, setSource] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadingStages = [
    "Ingesting text tokens...",
    "Assessing sentiment gradients...",
    "Extracting aspect references...",
    "Calculating fake-review probabilities...",
    "Computing explainability heatmaps...",
    "Finalizing business recommendations..."
  ];

  const handleAnalyze = async () => {
    if (!text.trim() || text.length < 5) {
      setError("Please write a descriptive review of at least 5 characters.");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);
    setLoadingStage(0);

    // Cycle through loading stages for premium UX feedback
    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => (prev < loadingStages.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await axios.post("/api/reviews/analyze", {
        review_text: text,
        source_dataset: source,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Review analysis pipeline failed. Please try again.");
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case "joy": return "😊";
      case "anger": return "😡";
      case "sadness": return "😢";
      case "love": return "😍";
      case "fear": return "😨";
      case "surprise": return "😲";
      default: return "😐";
    }
  };

  // Helper to choose highlight bg color based on explainability score
  const getWordHighlightClass = (score: number) => {
    if (score > 0.15) {
      // Positive contribution - Green
      return "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30";
    } else if (score < -0.15) {
      // Negative contribution - Red
      return "bg-rose-100 dark:bg-rose-950/45 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/30";
    }
    // Neutral contribution - plain border
    return "hover:bg-secondary text-foreground border-transparent";
  };

  const sampleReviews = [
    {
      text: "The product quality is excellent! Very sturdy build. However, shipping was delayed by three days and customer support was extremely slow in replying to my complaints about delivery.",
      source: "amazon"
    },
    {
      text: "Terrible price for this item! It is completely overpriced and constructed cheaply. The package box arrived crushed, packaging was useless. Highly disappointed, waste of money.",
      source: "yelp"
    },
    {
      text: "Beautiful look and modern styling, fits perfectly in my space. Charge capacity lasts for hours, battery life exceeds specifications! Highly recommend this awesome camera feature.",
      source: "flipkart"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">AI Review Analysis Sandbox</h2>
        <p className="text-xs text-muted-foreground">
          Analyze sentiment, emotions, feature aspects, fake risks, and explain predictions instantly
        </p>
      </div>

      {/* Input Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form Column (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Review Text Input
              </label>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none"
                >
                  <option value="custom">Custom Entry</option>
                  <option value="amazon">Amazon Sync</option>
                  <option value="flipkart">Flipkart Sync</option>
                  <option value="imdb">IMDb Rating</option>
                  <option value="yelp">Yelp Feedback</option>
                </select>
                <button
                  onClick={() => setText("")}
                  className="px-3 py-1.5 border border-border text-[10px] uppercase font-bold hover:bg-secondary rounded-xl cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type customer feedback here... (e.g. 'The material quality is wonderful, but price is expensive.')"
              className="w-full p-4 rounded-xl border border-border bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
            />

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/35 text-rose-600 dark:text-rose-400 text-xs font-semibold flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>{loadingStages[loadingStage]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  Run Review Intel Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Samples Sidebar (Span 1) */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs h-fit space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Quick Demo Templates
          </h4>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Select one of these pre-written reviews to quickly test the multi-class NLP pipeline and aspect detectors:
          </p>

          <div className="space-y-3.5">
            {sampleReviews.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setText(sample.text);
                  setSource(sample.source);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-border hover:border-indigo-500/30 bg-background/50 hover:bg-secondary/40 text-xs leading-normal transition-all space-y-2 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    Template #{idx + 1}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground uppercase font-bold rounded-md">
                    {sample.source}
                  </span>
                </div>
                <p className="line-clamp-2 text-muted-foreground leading-relaxed">{sample.text}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Section 1: KPI Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Sentiment KPI */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sentiment Class</span>
              <h3 className="text-2xl font-black mt-2 uppercase flex items-center gap-2">
                <span className={
                  result.sentiment === "positive" ? "text-emerald-500" : result.sentiment === "negative" ? "text-rose-500" : "text-amber-500"
                }>
                  {result.sentiment}
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-2 font-semibold">
                Confidence Score: {(result.sentiment_confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* Stars predicted KPI */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Star Rating Prediction</span>
              <div className="flex items-center gap-1 mt-2 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < result.rating_predicted ? "fill-amber-500 text-amber-500" : "text-border"}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-semibold">
                Predicted Rating: {result.rating_predicted} / 5.0 Stars
              </p>
            </div>

            {/* Dominant Emotion KPI */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emotion Category</span>
              <h3 className="text-2xl font-black mt-2 flex items-center gap-2 uppercase">
                <span>{getEmotionEmoji(result.emotion)}</span>
                <span className="text-indigo-500">{result.emotion}</span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-2 font-semibold">
                Emotion Score: {(result.emotion_confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* Process Latency KPI */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative">
              <div className="absolute top-4 right-4 text-muted-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Latency Speed</span>
              <h3 className="text-2xl font-black mt-2">{result.processing_time_ms} <span className="text-xs font-medium text-muted-foreground">ms</span></h3>
              <p className="text-[10px] mt-2 font-semibold flex items-center gap-1 text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                Pipeline complete
              </p>
            </div>
          </div>

          {/* Section 2: AI Explainability Heatmap */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                AI Explainability: Importance Heatmap
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Hover over words to see positive (<span className="text-emerald-500 font-semibold">green</span>) or negative (<span className="text-rose-500 font-semibold">red</span>) contribution weightings for the predicted sentiment class.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/50 flex flex-wrap gap-x-1.5 gap-y-2.5 leading-relaxed text-sm">
              {result.explanation_data.map((item, index) => (
                <div
                  key={index}
                  title={`Word: "${item.word}" | Score: ${item.score > 0 ? "+" : ""}${item.score.toFixed(2)}`}
                  className={`px-1.5 py-0.5 rounded-md border text-xs font-medium transition-all duration-200 cursor-default ${getWordHighlightClass(item.score)}`}
                >
                  {item.word}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: ABSA Aspect Grid */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Aspect-Based Sentiment Indicators
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Sentiment parsed individually for terms relating to shipping, packaging, price, and quality index.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              {[
                "Product Quality", "Price", "Delivery", "Packaging", 
                "Customer Service", "Performance", "Battery", "Design", "Features"
              ].map((aspect) => {
                const details = result.aspect_sentiment[aspect];
                const active = !!details;
                
                return (
                  <div
                    key={aspect}
                    className={`p-3 rounded-xl border text-center flex flex-col justify-between h-24 transition-all ${
                      active
                        ? details.sentiment === "positive"
                          ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/35"
                          : details.sentiment === "negative"
                          ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/35"
                          : "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/35"
                        : "bg-background/40 border-border opacity-50"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide truncate">{aspect}</span>
                    
                    {active ? (
                      <div className="space-y-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${
                          details.sentiment === "positive" ? "text-emerald-600 dark:text-emerald-400" : details.sentiment === "negative" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                        }`}>
                          {details.sentiment}
                        </span>
                        <p className="text-[9px] text-muted-foreground font-semibold">Ratio: {details.score}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Not mentioned</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Summarization, Key complaints & Business Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Short & Detailed summary card */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <h4 className="font-bold text-sm tracking-tight">AI Summarization Analysis</h4>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Executive Brief</span>
                  <p className="text-xs text-foreground bg-secondary/40 p-3.5 rounded-xl border border-border leading-relaxed font-medium">
                    {result.summary_short}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detailed Summary Synthesis</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {result.summary_detailed}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Complaints, praises & suggestions card */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <h4 className="font-bold text-sm tracking-tight">Executive Business Insights</h4>
              
              <div className="space-y-4 text-xs">
                {/* Praises */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Key Praises
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {result.insights.key_praises.map((praise, i) => (
                      <li key={i}>{praise}</li>
                    ))}
                  </ul>
                </div>

                {/* Complaints */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Key Complaints
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {result.insights.key_complaints.map((complaint, i) => (
                      <li key={i}>{complaint}</li>
                    ))}
                  </ul>
                </div>

                {/* Actionable recommendations */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Actionable Recommendations
                  </span>
                  <ul className="list-decimal pl-4 space-y-1.5 text-foreground leading-relaxed font-medium">
                    {result.insights.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Keywords & Authenticity Guard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Authenticity Guard */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Review Authenticity & Risk Assessment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                {/* Bot Prob */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bot Probability</span>
                  <h5 className="text-xl font-bold mt-1 text-foreground">{(result.bot_probability * 100).toFixed(0)}%</h5>
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${result.bot_probability * 100}%` }} />
                  </div>
                </div>

                {/* Spam Prob */}
                <div className="p-3.5 rounded-xl border border-border bg-background/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spam Probability</span>
                  <h5 className="text-xl font-bold mt-1 text-foreground">{(result.fake_probability * 100).toFixed(0)}%</h5>
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-2.5">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${result.fake_probability * 100}%` }} />
                  </div>
                </div>

                {/* Risk score */}
                <div className={`p-3.5 rounded-xl border ${
                  result.risk_score >= 0.7 
                    ? "bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/35 text-rose-700 dark:text-rose-400"
                    : "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/35 text-emerald-700 dark:text-emerald-400"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anomaly Risk Score</span>
                  <h5 className="text-xl font-black mt-1">{(result.risk_score * 100).toFixed(0)}%</h5>
                  <p className="text-[9px] mt-2 font-bold uppercase tracking-wide">
                    {result.risk_score >= 0.7 ? "Suspicious / Anomalous" : "High Authenticity"}
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Keywords */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3.5">
              <h4 className="font-bold text-sm">Extracted Keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 bg-secondary text-muted-foreground hover:text-foreground border border-border text-xs rounded-xl font-semibold select-none transition-colors"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
