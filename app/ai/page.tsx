"use client";

import { useState, useRef } from "react";
import { format, subMonths } from "date-fns";
import {
  IconSparkles,
  IconTarget,
  IconYen,
  IconBarChart,
  IconCircleCheck,
  IconArrowUp,
} from "@/components/ui/Icons";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");
const THREE_MONTHS_AGO = format(subMonths(new Date(), 2), "yyyy-MM");

function MarkdownLine({ text }: { text: string }) {
  // Bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function StreamedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="space-y-1.5 my-2 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <MarkdownLine text={item} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList(`flush-h2-${i}`);
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-900 mt-6 mb-2 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block flex-shrink-0" />
          <MarkdownLine text={line.slice(3)} />
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList(`flush-h3-${i}`);
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1.5">
          <MarkdownLine text={line.slice(4)} />
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      flushList(`flush-h4-${i}`);
      elements.push(
        <h4 key={i} className="text-sm font-semibold text-indigo-700 mt-3 mb-1">
          <MarkdownLine text={line.slice(5)} />
        </h4>
      );
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.slice(2).trim());
    } else if (/^\d+\.\s/.test(line)) {
      flushList(`flush-ol-${i}`);
      const num = line.match(/^(\d+)\.\s/)?.[1] ?? "";
      elements.push(
        <div key={i} className="flex items-start gap-3 my-1.5">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
            {num}
          </span>
          <p className="text-slate-700 leading-relaxed flex-1">
            <MarkdownLine text={line.replace(/^\d+\.\s/, "")} />
          </p>
        </div>
      );
    } else if (line.startsWith("---")) {
      flushList(`flush-hr-${i}`);
      elements.push(<hr key={i} className="my-4 border-slate-200" />);
    } else if (line.trim() === "") {
      flushList(`flush-empty-${i}`);
    } else {
      flushList(`flush-p-${i}`);
      elements.push(
        <p key={i} className="text-slate-700 leading-relaxed my-1">
          <MarkdownLine text={line} />
        </p>
      );
    }
  });
  flushList("flush-end");

  return <div>{elements}</div>;
}

export default function AiPage() {
  const [targetCpa, setTargetCpa] = useState("");
  const [from, setFrom] = useState(THREE_MONTHS_AGO);
  const [to, setTo] = useState(CURRENT_MONTH);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = async () => {
    if (!targetCpa || isNaN(Number(targetCpa))) {
      setError("目標CPAを入力してください");
      return;
    }
    setError("");
    setResult("");
    setDone(false);
    setLoading(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCpa: Number(targetCpa), from, to }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "分析に失敗しました");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("ストリームの読み取りに失敗しました");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        accumulated += decoder.decode(value, { stream: true });
        setResult(accumulated);
      }

      setDone(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("分析中にエラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
    setDone(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-widest text-indigo-500 uppercase">AI Analysis</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI改善提案</h1>
          <p className="text-sm text-slate-500 mt-1">
            キャンペーンデータをClaudeで分析し、目標CPA未達の改善アクションを提示します
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <IconSparkles size={22} className="text-white" />
        </div>
      </div>

      {/* Input Card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <IconTarget size={16} className="text-indigo-500" />
          <p className="text-sm font-bold text-slate-700">分析条件</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">
              目標CPA (円) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconYen size={14} />
              </span>
              <input
                type="number"
                value={targetCpa}
                onChange={(e) => setTargetCpa(e.target.value)}
                className="input pl-8"
                placeholder="例: 8000"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="label">集計開始月</label>
            <input
              type="month"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">集計終了月</label>
            <input
              type="month"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary gap-2"
          >
            <IconSparkles size={15} />
            {loading ? "分析中..." : "AI分析を実行"}
          </button>
          {loading && (
            <button onClick={handleStop} className="btn-secondary">
              停止
            </button>
          )}
        </div>
      </div>

      {/* Streaming loading indicator */}
      {loading && !result && (
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IconSparkles size={20} className="text-indigo-400" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Claudeが分析中...</p>
            <p className="text-sm text-slate-500 mt-1">キャンペーンデータを解析し、改善提案を生成しています</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card overflow-hidden animate-fade-in-up">
          {/* Result header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-violet-50/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                <IconBarChart size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">AI分析レポート</p>
                <p className="text-xs text-slate-500">目標CPA: ¥{Number(targetCpa).toLocaleString()}</p>
              </div>
            </div>
            {done && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <IconCircleCheck size={13} />
                分析完了
              </span>
            )}
            {loading && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                生成中...
              </span>
            )}
          </div>

          {/* Result body */}
          <div className="px-6 py-5 text-sm">
            <StreamedMarkdown text={result} />
            {loading && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {done && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                ※ AI提案は参考情報です。実施前に担当者と確認してください。
              </p>
              <button
                onClick={() => {
                  setResult("");
                  setDone(false);
                }}
                className="btn-ghost text-xs py-1.5 px-3"
              >
                クリア
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guide card (shown when no result) */}
      {!result && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: IconTarget,
              title: "目標CPAを設定",
              desc: "1件の契約を獲得するための許容コストを入力します。例: ¥8,000",
              color: "from-rose-500 to-pink-500",
              bg: "bg-rose-50",
              border: "border-rose-100",
            },
            {
              icon: IconBarChart,
              title: "データを自動取得",
              desc: "登録済みのキャンペーンデータを期間でフィルタリングして集計します。",
              color: "from-indigo-500 to-violet-500",
              bg: "bg-indigo-50",
              border: "border-indigo-100",
            },
            {
              icon: IconArrowUp,
              title: "改善提案を受け取る",
              desc: "未達の店舗・媒体ごとに、具体的な改善アクションを提示します。",
              color: "from-emerald-500 to-teal-500",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
            },
          ].map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div key={title} className={`rounded-2xl border ${border} ${bg} p-4`}>
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm mb-3`}
              >
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
