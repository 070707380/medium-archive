import React from 'react';
import { RATING_SCALE_LEVELS } from '../types';
import { Award, Star, CheckCircle2, Shield, BookOpen } from 'lucide-react';

interface RatingScalePageProps {
  onBackToArchive?: () => void;
}

export const RatingScalePage: React.FC<RatingScalePageProps> = ({ onBackToArchive }) => {
  return (
    <div className="max-w-5xl mx-auto px-2 py-4 space-y-5 animate-fade-in font-mono">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0c0e14] via-[#111520] to-[#14120f] p-4 sm:p-5 rounded-xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            <Shield size={12} /> Evaluation Methodology
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-slate-100 tracking-tight">
            HORNET'S 10-POINT RATING SCALE
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed font-sans">
            Media logged in this archive is evaluated strictly out of <span className="text-amber-400 font-bold font-mono">10</span>. 
            Every score tier corresponds to a precise qualitative benchmark of artistic intent, depth, and execution.
          </p>

          {onBackToArchive && (
            <button
              onClick={onBackToArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition shadow mt-1"
            >
              ← Explore Archive Vault
            </button>
          )}
        </div>
      </div>

      {/* Rating Scale Breakdown List */}
      <div className="grid grid-cols-1 gap-2.5">
        {RATING_SCALE_LEVELS.map((level) => (
          <div
            key={level.score}
            className="bg-[#0e1117] border border-slate-800/90 hover:border-slate-700 p-3.5 sm:p-4 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-start sm:items-center gap-3">
              {/* Score Badge */}
              <div className="shrink-0 w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shadow-inner group-hover:scale-105 transition">
                <span className={`text-lg font-black ${level.color}`}>
                  {level.score}
                </span>
                <span className="text-[9px] text-slate-500">/10</span>
              </div>

              {/* Title & Description */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm font-bold ${level.color}`}>
                    {level.label}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${level.bgBadge}`}>
                    Grade {level.score}/10
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal font-sans">
                  {level.description}
                </p>
              </div>
            </div>

            {/* Score Visual Indicator */}
            <div className="flex items-center gap-1 shrink-0 sm:self-center">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-5 rounded-full transition ${
                    i < level.score
                      ? level.score >= 9
                        ? 'bg-purple-400 shadow-sm shadow-purple-400/50'
                        : level.score >= 7
                        ? 'bg-sky-400 shadow-sm shadow-sky-400/40'
                        : level.score >= 5
                        ? 'bg-emerald-400'
                        : level.score >= 4
                        ? 'bg-yellow-400'
                        : 'bg-rose-500'
                      : 'bg-slate-800/60'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notes */}
      <div className="p-4 rounded-xl bg-[#0e1117] border border-slate-800/90 text-xs text-slate-300 space-y-1 font-mono">
        <div className="flex items-center gap-1.5 text-slate-100 font-bold">
          <BookOpen size={13} className="text-amber-400" /> Scoring Philosophy
        </div>
        <p className="leading-relaxed font-sans text-slate-300 text-xs">
          This scoring philosophy values the intrinsic <span className="text-amber-300 font-medium">lived experience</span>, <span className="text-amber-300 font-medium">structural consistency</span>, <span className="text-amber-300 font-medium">emotional depth</span>, and <span className="text-amber-300 font-medium font-mono">content & mechanism</span> above all else. External factors—such as commercial sales figures, mainstream hype, or historical influence—are entirely disregarded unless they directly impact the artistic or interactive experience itself.
        </p>
      </div>
    </div>
  );
};
