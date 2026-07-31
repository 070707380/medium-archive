import React, { useState, useMemo } from 'react';
import { MediaItem, RATING_SCALE_LEVELS, getScoreLevelInfo } from '../types';
import { MediaCard } from './MediaCard';
import { BarChart3, PieChart, Star, Shield, Filter, Tag, UserCheck, Layers, Award } from 'lucide-react';

interface HornetsPageProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
  onCreatorClick: (creatorName: string) => void;
}

export const HornetsPage: React.FC<HornetsPageProps> = ({
  items,
  onItemClick,
  onTagClick,
  onCreatorClick,
}) => {
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string | null>(null);

  // Group items by rounded integer score 1 to 10
  const ratingDistribution = useMemo(() => {
    const dist: Record<number, MediaItem[]> = {
      10: [],
      9: [],
      8: [],
      7: [],
      6: [],
      5: [],
      4: [],
      3: [],
      2: [],
      1: [],
    };

    items.forEach((item) => {
      const scoreKey = Math.max(1, Math.min(10, Math.round(item.hornetScore)));
      if (dist[scoreKey]) {
        dist[scoreKey].push(item);
      }
    });

    return dist;
  }, [items]);

  // Format distribution
  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.mediaFormat] = (counts[item.mediaFormat] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Max format count for chart scaling
  const maxFormatCount = useMemo(() => {
    const values = Object.values(formatCounts);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  }, [formatCounts]);

  // Calculate Average Score
  const averageScore = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, curr) => acc + curr.hornetScore, 0);
    return (sum / items.length).toFixed(1);
  }, [items]);

  // Top Philosophical Tags
  const topPhilosophicalTags = useMemo(() => {
    const tagMap: Record<string, number> = {};
    items.forEach((item) => {
      item.philosophicalTags?.forEach((t) => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    return Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [items]);

  // Filtered items when a specific score level or format is selected
  const activeItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedRatingFilter !== null) {
        const scoreKey = Math.max(1, Math.min(10, Math.round(item.hornetScore)));
        if (scoreKey !== selectedRatingFilter) return false;
      }
      if (selectedFormatFilter !== null) {
        if (item.mediaFormat !== selectedFormatFilter) return false;
      }
      return true;
    });
  }, [items, selectedRatingFilter, selectedFormatFilter]);

  const maxItemCountInRating = useMemo(() => {
    return Math.max(...Object.values(ratingDistribution).map((arr) => arr.length), 1);
  }, [ratingDistribution]);

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-2 py-2 space-y-6 animate-fade-in font-mono">
      {/* Curator Header Banner */}
      <div className="bg-gradient-to-r from-[#0c0e14] via-[#111520] to-[#14120f] p-4 sm:p-5 rounded-xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <UserCheck size={12} /> Curator Analytics
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-100 tracking-tight">
              HORNET'S METRICS
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              Rating distributions and format analytics across all logged experienced media.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-lg text-center">
              <div className="text-lg font-black text-amber-400">{items.length}</div>
              <div className="text-[10px] text-slate-400">Total Entries</div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-lg text-center">
              <div className="text-lg font-black text-emerald-400">{averageScore} <span className="text-[10px] text-slate-500">/10</span></div>
              <div className="text-[10px] text-slate-400">Mean Score</div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-lg text-center">
              <div className="text-lg font-black text-cyan-400">
                {ratingDistribution[10].length + ratingDistribution[9].length}
              </div>
              <div className="text-[10px] text-slate-400">9-10 Masterpieces</div>
            </div>
          </div>
        </div>
      </div>

      {/* UNIFIED RATING DISTRIBUTION CHART */}
      <section className="space-y-3">
        <div className="bg-[#0e1117] border border-slate-800/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-amber-400" size={18} />
              <h2 className="text-sm font-black tracking-wider text-slate-100 uppercase">
                Unified Score Distribution Chart (1 to 10)
              </h2>
            </div>

            {selectedRatingFilter !== null && (
              <button
                onClick={() => setSelectedRatingFilter(null)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
              >
                Clear Rating Filter ({selectedRatingFilter}/10)
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No media entries logged in archive yet.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Single cohesive chart canvas */}
              <div className="relative h-56 w-full bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 flex items-end justify-between gap-2 overflow-hidden">
                {/* Horizontal grid guide lines */}
                <div className="absolute inset-x-0 top-1/4 border-b border-slate-800/40 pointer-events-none" />
                <div className="absolute inset-x-0 top-2/4 border-b border-slate-800/40 pointer-events-none" />
                <div className="absolute inset-x-0 top-3/4 border-b border-slate-800/40 pointer-events-none" />

                {RATING_SCALE_LEVELS.map((level) => {
                  const count = ratingDistribution[level.score].length;
                  const isSelected = selectedRatingFilter === level.score;
                  const barHeightPct = maxItemCountInRating > 0 ? (count / maxItemCountInRating) * 100 : 0;

                  return (
                    <div
                      key={level.score}
                      onClick={() => setSelectedRatingFilter(isSelected ? null : level.score)}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative z-10"
                    >
                      {/* Count tooltip on top */}
                      <span className={`text-[10px] font-bold mb-1 transition-transform group-hover:scale-110 ${
                        isSelected ? 'text-amber-400 font-extrabold' : 'text-slate-400 group-hover:text-slate-100'
                      }`}>
                        {count}
                      </span>

                      {/* Bar Pillar */}
                      <div className="w-full max-w-[48px] bg-slate-900/60 rounded-t-md p-0.5 h-full flex items-end">
                        <div
                          style={{ height: `${Math.max(barHeightPct, count > 0 ? 8 : 0)}%` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                              : count > 0
                              ? 'bg-gradient-to-t from-slate-700 via-amber-500/80 to-amber-400 group-hover:from-amber-600 group-hover:to-amber-300'
                              : 'bg-transparent'
                          }`}
                        />
                      </div>

                      {/* Score Level Marker Below Bar */}
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-black block transition ${
                          isSelected ? 'text-amber-400 scale-110' : level.color
                        }`}>
                          {level.score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* DEDICATED MEDIA FORMAT CHART & THEMES */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dedicated Format Chart */}
          <div className="bg-[#0e1117] border border-slate-800/90 p-4 sm:p-5 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase">
                <PieChart size={16} className="text-amber-400" />
                Format Distribution Chart
              </h3>
              {selectedFormatFilter && (
                <button
                  onClick={() => setSelectedFormatFilter(null)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Clear Format Filter
                </button>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {Object.entries(formatCounts).map(([fmt, count]) => {
                const pct = ((count / items.length) * 100).toFixed(0);
                const barWidthPct = ((count / maxFormatCount) * 100).toFixed(0);
                const isSelected = selectedFormatFilter === fmt;

                return (
                  <div
                    key={fmt}
                    onClick={() => setSelectedFormatFilter(isSelected ? null : fmt)}
                    className={`p-2 rounded-xl transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400'
                        : 'bg-slate-950/60 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className={`font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                        {fmt}
                      </span>
                      <span className="text-amber-400 font-extrabold text-[11px]">
                        {count} <span className="text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        style={{ width: `${barWidthPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSelected ? 'bg-amber-400 shadow-md shadow-amber-400/50' : 'bg-gradient-to-r from-amber-500 to-amber-300'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Philosophical Themes */}
          <div className="bg-[#0e1117] border border-slate-800/90 p-4 sm:p-5 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase">
                <Tag size={16} className="text-amber-400" />
                Philosophical Index
              </h3>
            </div>

            {topPhilosophicalTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {topPhilosophicalTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => onTagClick(tag)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 transition group shadow-sm"
                  >
                    <span>{tag}</span>
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No philosophical tags logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* FILTERED MEDIA ITEMS DISPLAY */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 uppercase">
              <Layers size={16} className="text-amber-400" />
              {selectedRatingFilter !== null || selectedFormatFilter !== null
                ? `Filtered View (${activeItems.length})`
                : `All Logged Media Entries (${activeItems.length})`}
            </h2>
          </div>

          {(selectedRatingFilter !== null || selectedFormatFilter !== null) && (
            <button
              onClick={() => {
                setSelectedRatingFilter(null);
                setSelectedFormatFilter(null);
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {activeItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {activeItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={onItemClick}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#0e1117] rounded-xl border border-slate-800/90 p-6">
            <p className="text-xs text-slate-400">
              No items match the currently selected filter parameters.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
