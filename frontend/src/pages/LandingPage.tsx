import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Database,
  Terminal,
  Layers,
} from "lucide-react";

export const LandingPage: React.FC = () => {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const features = [
    {
      title: "Aspect-Based Sentiment",
      desc: "Segment customer feedback into explicit dimensions like quality, packaging, performance, price, or service.",
      icon: Layers,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Emotion Identification",
      desc: "Go beyond simple positive/negative analysis to classify joy, anger, sadness, fear, surprise, and affection.",
      icon: Brain,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Fake & Spam Review Guard",
      desc: "Audit comments for bot style indices, repetition risk patterns, and rating-sentiment discrepancies.",
      icon: ShieldAlert,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
    },
    {
      title: "Executive Summarization",
      desc: "Condense long logs of comments into short summaries and actionable suggestions with one click.",
      icon: Sparkles,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-background/70 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              R
            </div>
            <span className="font-bold text-lg tracking-tight">Sentiment Analysis of Reviews</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-6 uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Next-Gen NLP Processing Engine
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6"
          >
            Turn Raw Reviews Into <br />
            <span className="bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Actionable Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Understand exactly what customers love and hate. Aggregate sentiments, trace aspects,
            detect bot anomalies, and compile PDF reports using transformer models.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Deploy Platform
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 rounded-xl font-bold border border-border bg-card text-foreground hover:bg-secondary transition-all"
            >
              Explore Capabilities
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 md:px-8 bg-secondary/30 border-y border-border/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4">
              Designed For High-Growth Teams
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              A comprehensive toolset mimicking top commercial NLP systems to audit customer opinion.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="p-6 md:p-8 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex gap-4 md:gap-5 items-start">
                    <div className={`p-3 rounded-xl ${feature.color} shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Technical Specs */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
              Enterprise Technology Foundation
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Our architecture pairs lightweight Hugging Face transformers with a robust FastAPI pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 w-fit mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-2">Deep Learning Models</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Fine-tuned DistilBERT models loaded directly on CPU, caching token states for maximum performance.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">DistilBERT</span>
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">T5-Small</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 w-fit mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-2">Relational Logging</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                SQLAlchemy schema bindings record analysis outputs, aspect ratios, and keywords in SQLite/PostgreSQL.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">SQLAlchemy</span>
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">Pydantic</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-500 w-fit mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-2">Performance & Speed</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Asynchronous token parsing and local pipeline fallbacks keep endpoints running in under 20 milliseconds.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">FastAPI</span>
                <span className="text-[10px] font-semibold bg-secondary px-2.5 py-1 rounded-md text-muted-foreground">Async Worker</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 px-4 bg-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
            Ready to Analyze Customer Feedback?
          </h2>
          <p className="text-indigo-200 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Create a free developer account now and upload your review databases in CSV or Excel layouts.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-950 font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-50 shadow-lg shadow-white/10 transition-all cursor-pointer"
          >
            Start Analyzing Now
            <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
      </section>

      {/* Footer info */}
      <footer className="py-8 border-t border-border/80 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Sentiment Analysis of Reviews. Designed for enterprise NLP review analytics.</p>
          <div className="flex gap-6">
            <span className="hover:text-foreground cursor-pointer">Security Policy</span>
            <span className="hover:text-foreground cursor-pointer">API Specs</span>
            <span className="hover:text-foreground cursor-pointer">Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
