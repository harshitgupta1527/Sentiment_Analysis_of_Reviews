import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Award,
  Layers,
  Zap,
  BookOpen,
  Calendar,
  Layers3,
  RefreshCw,
} from "lucide-react";

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

export const ModelInfo: React.FC = () => {
  const { data, isLoading, refetch } = useQuery<ModelStatusItem[]>({
    queryKey: ["modelInventory"],
    queryFn: async () => {
      const res = await axios.get("/api/admin/model-status");
      return res.data;
    },
  });

  const getModelSpecs = (task: string) => {
    switch (task.toLowerCase()) {
      case "sentiment":
        return {
          displayName: "Multilingual DistilBERT Student",
          weightsSize: "268 MB",
          vocabSize: "119,547 tokens",
          trainingDataset: "SST-2 + Multilingual Lexicons",
          inferenceSpeed: "12 - 18 ms",
          architecture: "Transformer Encoder (6-layer BERT)",
        };
      case "emotion":
        return {
          displayName: "Emotion Classifier (Fine-tuned DistilBERT)",
          weightsSize: "268 MB",
          vocabSize: "30,522 tokens",
          trainingDataset: "CARER Twitter Emotion Dataset",
          inferenceSpeed: "14 - 22 ms",
          architecture: "Transformer Encoder (6-layer BERT)",
        };
      case "summarization":
        return {
          displayName: "T5-Small Sequence-to-Sequence",
          weightsSize: "242 MB",
          vocabSize: "32,100 tokens",
          trainingDataset: "CNN / DailyMail summarization logs",
          inferenceSpeed: "120 - 180 ms",
          architecture: "Transformer Encoder-Decoder (T5)",
        };
      default:
        return {
          displayName: "Generic Classifier Pipeline",
          weightsSize: "N/A",
          vocabSize: "N/A",
          trainingDataset: "N/A",
          inferenceSpeed: "N/A",
          architecture: "N/A",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Model Specifications Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Explore neural network architectures, validation metrics, cached parameters, and vocabulary stats
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-border bg-card text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
          <span className="text-xs text-muted-foreground animate-pulse">Querying NLP inventory specs...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data?.map((model) => {
            const specs = getModelSpecs(model.task);
            return (
              <div
                key={model.id}
                className="p-5 border border-border rounded-2xl bg-card shadow-xs flex flex-col justify-between space-y-5"
              >
                {/* Card Title Header */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md">
                      {model.task} pipeline
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider ${
                      model.status === "active" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200" : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200"
                    }`}>
                      {model.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-tight">{specs.displayName}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{model.model_name}</p>
                </div>

                {/* Specs breakdown */}
                <div className="space-y-2.5 text-xs border-y border-border py-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Layers3 className="w-3.5 h-3.5" /> Architecture</span>
                    <span className="font-semibold text-right max-w-40 truncate">{specs.architecture}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Vocab Capacity</span>
                    <span className="font-semibold">{specs.vocabSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Weights File</span>
                    <span className="font-semibold">{specs.weightsSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Avg Latency</span>
                    <span className="font-bold text-emerald-500">{specs.inferenceSpeed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Dataset Root</span>
                    <span className="font-semibold text-right max-w-44 truncate">{specs.trainingDataset}</span>
                  </div>
                </div>

                {/* Validation Scores */}
                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-500" /> Validation Metrics
                  </span>
                  
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="p-1.5 bg-secondary/50 rounded-lg">
                      <span className="block text-[8px] uppercase text-muted-foreground font-bold">Acc</span>
                      <span className="font-bold text-foreground">{model.accuracy ? model.accuracy.toFixed(2) : "0.0"}</span>
                    </div>
                    <div className="p-1.5 bg-secondary/50 rounded-lg">
                      <span className="block text-[8px] uppercase text-muted-foreground font-bold">Prec</span>
                      <span className="font-bold text-foreground">{model.precision ? model.precision.toFixed(2) : "0.0"}</span>
                    </div>
                    <div className="p-1.5 bg-secondary/50 rounded-lg">
                      <span className="block text-[8px] uppercase text-muted-foreground font-bold">Recall</span>
                      <span className="font-bold text-foreground">{model.recall ? model.recall.toFixed(2) : "0.0"}</span>
                    </div>
                    <div className="p-1.5 bg-secondary/50 rounded-lg">
                      <span className="block text-[8px] uppercase text-muted-foreground font-bold">F1</span>
                      <span className="font-bold text-indigo-500">{model.f1_score ? model.f1_score.toFixed(2) : "0.0"}</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
