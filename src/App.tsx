/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { 
  Plus, 
  Upload, 
  Sparkles, 
  History, 
  FileText, 
  Code, 
  BookOpen, 
  Copy, 
  Download, 
  Trash2, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import confetti from "canvas-confetti";

import { analyzeBlackboard } from "./lib/gemini";
import type { AnalysisResult, HistoryItem, AnalysisOptions } from "./types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { AudioVisualizer } from "./components/AudioVisualizer";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"lesson" | "latex" | "summary">("lesson");
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AnalysisOptions>({
    fullLatex: true,
    organizedLesson: true,
    arabicExplanation: true,
    suggestedExercises: true,
    summary: true,
  });

  const audioRecorder = useAudioRecorder();

  // Handle file drop/upload
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedImage && !audioRecorder.audioData) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const imagePayload = selectedImage ? {
        base64: selectedImage,
        mimeType: selectedImage.substring(selectedImage.indexOf(":") + 1, selectedImage.indexOf(";"))
      } : null;

      const audioPayload = audioRecorder.audioData ? {
        base64: audioRecorder.audioData.base64,
        mimeType: audioRecorder.audioData.blob.type || "audio/webm"
      } : null;

      const data = await analyzeBlackboard(imagePayload, audioPayload);
      
      setResult(data);
      
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        imageUrl: selectedImage,
        audioUrl: audioRecorder.audioData?.url,
        result: data,
      };
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 5));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ffffff", "#101010"]
      });

      // Clear audio context correctly on success context
      // audioRecorder.clearAudio(); // Keep to review or explicit clear
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadTex = () => {
    if (!result) return;
    const blob = new Blob([result.latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.topic.replace(/\\s+/g, "_")}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasContent = !!selectedImage || !!audioRecorder.audioData;

  const loadHistoryItem = (item: HistoryItem) => {
    setSelectedImage(item.imageUrl);
    setResult(item.result);
    // Note: audio recreation into memory from history is complex, we just set image and result for now.
  }

  return (
    <div className="min-h-screen font-sans selection:bg-accent/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Sparkles className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">SabboraAI</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold leading-none">Blackboard Vision</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-accent transition-colors">Home</a>
            <a href="#" className="hover:text-accent transition-colors">History</a>
            <a href="#" className="hover:text-accent transition-colors">Resources</a>
          </nav>

          <button className="text-white/60 hover:text-white transition-colors">
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload and Settings */}
          <div className="lg:col-span-5 space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">Input Source</h2>
                {hasContent && (
                  <button 
                    onClick={() => {setSelectedImage(null); setResult(null); audioRecorder.clearAudio();}}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              {/* Image Input Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "relative group transition-all duration-300 rounded-2xl overflow-hidden",
                  !selectedImage ? "h-48 border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer" : "h-48 border border-white/10 shadow-xl"
                )}
                onClick={() => !selectedImage && document.getElementById("file-upload")?.click()}
              >
                {!selectedImage ? (
                  <div className={cn("w-full h-full flex flex-col items-center justify-center p-4", isDragging ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]")}>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Upload Blackboard</p>
                      <p className="text-xs text-gray-500 mt-1">Drag and drop or format</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={selectedImage} alt="Blackboard" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
                      <p className="text-xs text-white/60">Selected Image ready</p>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Audio Input Area */}
              <div className="dark-academic-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold text-white">Teacher Audio</h3>
                  </div>
                  <span className="text-xs text-gray-500">Optional</span>
                </div>

                {!audioRecorder.isRecording && !audioRecorder.audioData && (
                  <button
                    onClick={audioRecorder.startRecording}
                    className="w-full py-4 rounded-xl border border-white/5 hover:border-white/20 bg-white/[0.02] hover:bg-white/5 transition-colors flex items-center justify-center gap-3 text-sm text-gray-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    Click to Start Recording
                  </button>
                )}

                {audioRecorder.isRecording && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                         <span className="text-red-400 font-mono font-medium">{formatTime(audioRecorder.recordingTime)}</span>
                       </div>
                       <button 
                         onClick={audioRecorder.stopRecording}
                         className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors flex items-center gap-2 text-xs font-semibold"
                       >
                         <Square className="w-4 h-4" fill="currentColor" /> Stop
                       </button>
                    </div>
                    {/* Visualizer */}
                    <AudioVisualizer analyser={audioRecorder.analyser} isRecording={audioRecorder.isRecording} />
                  </div>
                )}

                {audioRecorder.audioData && !audioRecorder.isRecording && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <audio src={audioRecorder.audioData.url} controls className="h-10 flex-1 opacity-80 filter invert sepia hue-rotate-[180deg] saturate-200" />
                    <button onClick={audioRecorder.clearAudio} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {audioRecorder.error && (
                  <p className="text-xs text-red-400">{audioRecorder.error}</p>
                )}
              </div>
            </section>

            <section className="dark-academic-card p-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Analysis Modules</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(options).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => setOptions(prev => ({ ...prev, [key]: !prev[key as keyof AnalysisOptions] }))}
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                    />
                    <span className="text-xs font-medium text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex items-center gap-4 py-2">
                 <div className="flex items-center gap-1.5 text-xs text-gray-400">
                   <div className={cn("w-2 h-2 rounded-full", selectedImage ? "bg-green-500" : "bg-gray-600")} />
                   Board photo {selectedImage ? "✓" : ""}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs text-gray-400">
                   <div className={cn("w-2 h-2 rounded-full", audioRecorder.audioData ? "bg-green-500" : "bg-gray-600")} />
                   Teacher audio {audioRecorder.audioData ? "✓" : ""}
                 </div>
              </div>

              {!selectedImage && audioRecorder.audioData && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3 text-blue-300 text-xs">
                   <Sparkles className="w-4 h-4 shrink-0 flex-none" />
                   <p>Tip: Add a board photo for even better results.</p>
                </div>
              )}

              <button
                disabled={!hasContent || isAnalyzing}
                onClick={handleAnalyze}
                className={cn(
                  "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300",
                  "shadow-[0_0_30px_-5px_transparent] hover:shadow-accent/20",
                  !hasContent || isAnalyzing 
                    ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                    : "bg-accent text-black hover:-translate-y-0.5"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze Lesson
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">{error}</p>
                </div>
              )}
            </section>

            {/* In-Memory History */}
            {history.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Recent Analysis</h3>
                <div className="space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 flex flex-col items-center justify-center text-gray-500">
                           <Mic className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.result.topic}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {!result && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/[0.01]">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-400">No Analysis Results</h3>
                <p className="text-sm text-gray-600 mt-2 max-w-xs">Upload an image or record audio and click analyze to see the magic happen.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center p-12 dark-academic-card relative">
                 <div className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-[2px] z-0" />
                 <div className="relative z-10 space-y-6 flex flex-col items-center text-center">
                    <div className="relative">
                       <div className="w-24 h-24 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                       <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display text-2xl font-bold text-white">Transcribing Knowledge</h3>
                      <p className="text-sm text-gray-400 animate-pulse">Our AI is processing inputs, structuring the content, and synthesizing insights...</p>
                    </div>
                    <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-accent"
                      />
                    </div>
                 </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="dark-academic-card flex flex-col h-full"
              >
                {/* Result Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-bold uppercase tracking-widest">{result.subject}</span>
                       <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> AI Confidence: High
                       </div>
                    </div>
                    <h2 className="font-display text-3xl font-bold text-white leading-tight">{result.topic}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyToClipboard(result.latex)}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white group relative"
                    >
                      <Copy className="w-5 h-5" />
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">Copy LaTeX</span>
                    </button>
                    <button 
                      onClick={downloadTex}
                      className="p-3 rounded-xl bg-accent text-black hover:bg-accent/90 transition-colors group relative"
                    >
                      <Download className="w-5 h-5" />
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">Download .tex</span>
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-6">
                  {(["lesson", "latex", "summary"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-6 py-4 text-sm font-semibold transition-all relative",
                        activeTab === tab ? "text-accent" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {tab === "lesson" && <BookOpen className="w-4 h-4" />}
                        {tab === "latex" && <Code className="w-4 h-4" />}
                        {tab === "summary" && <FileText className="w-4 h-4" />}
                        <span className="capitalize">{tab}</span>
                      </div>
                      {activeTab === tab && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20 min-h-[500px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="prose prose-invert prose-amber max-w-none"
                    >
                      {activeTab === "lesson" && (
                        <div className="space-y-8">
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                          >
                            {result.organized}
                          </ReactMarkdown>
                          
                          <div className="mt-12 pt-8 border-t border-white/5">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-accent mb-6">
                               <Sparkles className="w-5 h-5" /> Suggested Exercises
                            </h3>
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]} 
                              rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                              {result.exercises}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {activeTab === "latex" && (
                        <div className="relative group">
                          <pre className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto text-gray-400">
                             {result.latex}
                          </pre>
                        </div>
                      )}

                      {activeTab === "summary" && (
                        <div className="space-y-6">
                           <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 italic text-lg leading-relaxed text-gray-300 font-display">
                             “{result.summary}”
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                 <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Key Concept</p>
                                 <p className="text-sm font-semibold">{result.topic}</p>
                              </div>
                              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                 <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Complexity</p>
                                 <p className="text-sm font-semibold text-accent">Academic Level</p>
                              </div>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 opacity-50 grayscale">
            <Sparkles className="text-white w-6 h-6" />
            <h1 className="font-display text-lg font-bold tracking-tight text-white">SabboraAI</h1>
          </div>
          <p className="text-sm text-gray-600">Built for students and educators worldwide. © 2026 SabboraAI</p>
          <div className="flex gap-6 text-gray-500 text-xs font-semibold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
