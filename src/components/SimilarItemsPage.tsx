import React, { useState, useMemo } from 'react';
import { MediaItem } from '../types';
import { extractReleaseYear } from '../utils/dateUtils';
import { MediaCard } from './MediaCard';
import { Search, Compass, Layers, ArrowRight, RefreshCw, CheckCircle2, Award } from 'lucide-react';

interface SimilarItemsPageProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  onCreatorClick?: (creator: string) => void;
}

export interface SimilarityResult {
  item: MediaItem;
  score: number; // 0 to 100
  matchReasons: string[];
}

// Compute comprehensive similarity between target item and candidate item
export function calculateSimilarity(target: MediaItem, candidate: MediaItem): SimilarityResult {
  if (target.id === candidate.id) {
    return { item: candidate, score: 0, matchReasons: [] };
  }

  let rawPoints = 0;
  const matchReasons: string[] = [];

  // 1. Explicit Similarity Links (Direct Relation) - Max 25 pts
  const targetSimilarTitles = (target.similarMedia || []).map((sm) =>
    (typeof sm === 'string' ? sm : sm.title).toLowerCase().trim()
  );
  const targetInfluenceTitles = (target.mediumInfluences || []).map((mi) =>
    (typeof mi === 'string' ? mi : mi.title).toLowerCase().trim()
  );

  const candidateSimilarTitles = (candidate.similarMedia || []).map((sm) =>
    (typeof sm === 'string' ? sm : sm.title).toLowerCase().trim()
  );
  const candidateInfluenceTitles = (candidate.mediumInfluences || []).map((mi) =>
    (typeof mi === 'string' ? mi : mi.title).toLowerCase().trim()
  );

  const candTitleLower = candidate.title.toLowerCase().trim();
  const targetTitleLower = target.title.toLowerCase().trim();

  if (targetSimilarTitles.includes(candTitleLower) || targetInfluenceTitles.includes(candTitleLower)) {
    rawPoints += 25;
    matchReasons.push('Explicitly listed in target media relations');
  } else if (candidateSimilarTitles.includes(targetTitleLower) || candidateInfluenceTitles.includes(targetTitleLower)) {
    rawPoints += 20;
    matchReasons.push('Target listed in candidate media relations');
  }

  // 2. Media Format (Max 15 pts)
  if (target.mediaFormat === candidate.mediaFormat) {
    rawPoints += 15;
    matchReasons.push(`Same Format (${target.mediaFormat})`);
  } else {
    // Check related formats e.g. Film <-> TV Show, Game <-> Comic
    const visualGroup = ['Film', 'TV Show', 'Comic/Manga Series'];
    const interactiveGroup = ['Video Game'];
    const artGroup = ['Painting', 'Artwork'];

    if (visualGroup.includes(target.mediaFormat) && visualGroup.includes(candidate.mediaFormat)) {
      rawPoints += 8;
      matchReasons.push(`Related Medium (${candidate.mediaFormat})`);
    } else if (artGroup.includes(target.mediaFormat) && artGroup.includes(candidate.mediaFormat)) {
      rawPoints += 10;
      matchReasons.push(`Related Visual Art (${candidate.mediaFormat})`);
    }
  }

  // 3. Main Genres Overlap (Max 20 pts)
  const targetGenres = target.genres || [];
  const candGenres = candidate.genres || [];
  const sharedGenres = targetGenres.filter((g) =>
    candGenres.some((cg) => cg.toLowerCase().trim() === g.toLowerCase().trim())
  );

  if (sharedGenres.length > 0) {
    const genreScore = Math.min(20, Math.round((sharedGenres.length / Math.max(1, targetGenres.length)) * 20));
    rawPoints += genreScore;
    matchReasons.push(`Shared Genre: ${sharedGenres.slice(0, 2).join(', ')}`);
  }

  // 4. Philosophical Tags Overlap (Max 15 pts)
  const targetPhilo = target.philosophicalTags || [];
  const candPhilo = candidate.philosophicalTags || [];
  const sharedPhilo = targetPhilo.filter((t) =>
    candPhilo.some((ct) => ct.toLowerCase().trim() === t.toLowerCase().trim())
  );

  if (sharedPhilo.length > 0) {
    const philoScore = Math.min(15, Math.round((sharedPhilo.length / Math.max(1, targetPhilo.length)) * 15));
    rawPoints += philoScore;
    matchReasons.push(`Philosophical Theme: ${sharedPhilo.slice(0, 2).join(', ')}`);
  }

  // 5. Style Tags Overlap (Max 15 pts)
  const targetStyles = target.genreStyleTags || [];
  const candStyles = candidate.genreStyleTags || [];
  const sharedStyles = targetStyles.filter((s) =>
    candStyles.some((cs) => cs.toLowerCase().trim() === s.toLowerCase().trim())
  );

  if (sharedStyles.length > 0) {
    const styleScore = Math.min(15, Math.round((sharedStyles.length / Math.max(1, targetStyles.length)) * 15));
    rawPoints += styleScore;
    matchReasons.push(`Style Match: ${sharedStyles.slice(0, 2).join(', ')}`);
  }

  // 6. Creator & Country Connection (Max 10 pts)
  if (target.mainCreator && candidate.mainCreator &&
      target.mainCreator.toLowerCase().trim() === candidate.mainCreator.toLowerCase().trim()) {
    rawPoints += 8;
    matchReasons.push(`Same Main Creator (${target.mainCreator})`);
  } else {
    // Check other creators overlap
    const tOthers = (target.otherCreators || []).map((c) => c.toLowerCase().trim());
    const cOthers = (candidate.otherCreators || []).map((c) => c.toLowerCase().trim());
    const sharedCreators = tOthers.filter((c) => cOthers.includes(c) || c === target.mainCreator.toLowerCase().trim());
    if (sharedCreators.length > 0) {
      rawPoints += 5;
      matchReasons.push('Shared Collaborator / Creator');
    }
  }

  if (target.countryOfOrigin && candidate.countryOfOrigin &&
      target.countryOfOrigin.toLowerCase().trim() === candidate.countryOfOrigin.toLowerCase().trim()) {
    rawPoints += 2;
    matchReasons.push(`Origin (${target.countryOfOrigin})`);
  }

  // 7. Hornet Score & Era Proximity (Max 5 pts)
  const scoreDiff = Math.abs(target.hornetScore - candidate.hornetScore);
  if (scoreDiff <= 1.0) {
    rawPoints += 3;
    matchReasons.push(`Similar Quality Tier (${candidate.hornetScore}/10)`);
  } else if (scoreDiff <= 2.0) {
    rawPoints += 1;
  }

  const targetYear = extractReleaseYear(target.releaseDate);
  const candYear = extractReleaseYear(candidate.releaseDate);
  if (targetYear && candYear && Math.abs(targetYear - candYear) <= 5) {
    rawPoints += 2;
    matchReasons.push(`Same Era (${candYear})`);
  }

  // Final score normalized out of 100
  const finalScore = Math.min(100, Math.max(5, rawPoints));

  return {
    item: candidate,
    score: finalScore,
    matchReasons
  };
}

export const SimilarItemsPage: React.FC<SimilarItemsPageProps> = ({
  items,
  onItemClick,
  onTagClick,
  onCreatorClick,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(items[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target Item object
  const targetItem = useMemo(() => {
    return items.find((i) => i.id === selectedTargetId) || items[0] || null;
  }, [items, selectedTargetId]);

  // Autocomplete suggestions for media items search
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.mainCreator.toLowerCase().includes(q) ||
      i.genres?.some((g) => g.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [items, searchQuery]);

  // Calculate similarity for all items relative to selected target
  const rankedSimilarItems = useMemo(() => {
    if (!targetItem) return [];

    const candidates = items.filter((i) => i.id !== targetItem.id);
    const calculated = candidates.map((cand) => calculateSimilarity(targetItem, cand));

    // Sort highest score to lowest
    calculated.sort((a, b) => b.score - a.score);

    // Limit to top 50 items as requested
    return calculated.slice(0, 50);
  }, [targetItem, items]);

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0c0e14] via-[#111622] to-[#16121a] p-5 sm:p-6 rounded-2xl border border-amber-500/30 shadow-xl relative">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Compass size={14} /> Algorithmic Similarity Engine
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-slate-100 tracking-tight">
            SEARCH SIMILAR MEDIA
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed font-sans">
            Select any media entry in Hornet's database to generate an instant ranked breakdown of the top <span className="text-amber-400 font-bold font-mono">50 most similar products</span> out of 100, evaluating medium, genre overlap, philosophical themes, creators, and artistic connections.
          </p>

          {/* Target Media Picker / Quick Search */}
          <div className="pt-2 max-w-xl relative">
            <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
              Select or Search Target Media:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (suggestions.length > 0) {
                  setSelectedTargetId(suggestions[0].id);
                  setSearchQuery('');
                }
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Type media title or creator to pick target (Press Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-amber-500/50 rounded-xl pl-9 pr-24 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition shadow-inner font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </form>

            {/* Dropdown Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-amber-500/50 rounded-xl shadow-2xl z-[100] max-h-72 overflow-y-auto divide-y divide-slate-800/90 font-mono">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => {
                      setSelectedTargetId(sug.id);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 text-left hover:bg-slate-900 active:bg-slate-800 transition flex items-center justify-between gap-3 text-xs cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-slate-100 group-hover:text-amber-300 transition">{sug.title}</span>
                      <span className="text-slate-400 text-[10px] ml-2 font-mono">({sug.mediaFormat} • {sug.mainCreator})</span>
                    </div>
                    <span className="text-amber-400 font-bold text-[10px] shrink-0 font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                      {sug.hornetScore}/10
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TARGET MEDIA HIGHLIGHT CARD */}
      {targetItem && (
        <div className="bg-[#0e1117] border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={targetItem.cover}
                alt={targetItem.title}
                className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg object-cover border border-amber-500/50 shadow-md shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black uppercase">
                    Active Target
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {targetItem.mediaFormat} • {targetItem.releaseDate}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">
                  {targetItem.title}
                </h2>
                <p className="text-xs text-slate-300 font-mono">
                  Created by <span className="text-amber-300 font-bold">{targetItem.mainCreator}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0">
              <div className="text-center">
                <span className="text-2xl font-black text-amber-400 block font-mono">
                  {targetItem.hornetScore}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Hornet Score</span>
              </div>
            </div>
          </div>

          {/* Target Attributes Tag Bar */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {targetItem.genres?.map((g, i) => (
              <span key={`g-${i}`} className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                {g}
              </span>
            ))}
            {targetItem.philosophicalTags?.map((pt, i) => (
              <span key={`pt-${i}`} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[10px]">
                {pt}
              </span>
            ))}
            {targetItem.genreStyleTags?.map((st, i) => (
              <span key={`st-${i}`} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                {st}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SIMILARITY RESULTS LIST (Top 50 Ranked out of 100) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-100 flex items-center gap-2 uppercase">
            <Compass size={16} className="text-amber-400" />
            Top {rankedSimilarItems.length} Most Similar Entries (Ranked 100 to 0)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Evaluated against {items.length - 1} candidates
          </span>
        </div>

        {rankedSimilarItems.length === 0 ? (
          <div className="p-8 text-center bg-[#0e1117] rounded-xl border border-slate-800 text-slate-400 text-xs">
            No similar media found in database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3.5">
            {rankedSimilarItems.map((res, index) => {
              const { item, score, matchReasons } = res;
              const isTop3 = index < 3;

              // Score Badge color
              let scoreBadgeColor = 'bg-slate-900 text-slate-300 border-slate-700';
              if (score >= 80) scoreBadgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30';
              else if (score >= 60) scoreBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/60';
              else if (score >= 40) scoreBadgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-500/60';

              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="bg-[#0e1117] hover:bg-[#121620] border border-slate-800/90 hover:border-amber-500/50 p-4 rounded-xl transition cursor-pointer flex flex-col justify-between gap-3 group relative shadow-lg"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Rank Number & Cover */}
                    <div className="relative shrink-0">
                      <img
                        src={item.cover}
                        alt={item.title}
                        className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg object-cover border border-slate-800 group-hover:border-amber-400 transition"
                      />
                      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 text-amber-400 font-bold text-[10px] flex items-center justify-center shadow">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Title & Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.2 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold">
                            {item.mediaFormat}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.releaseDate}
                          </span>
                        </div>

                        {/* Similarity Score Pill */}
                        <div className={`px-2.5 py-0.5 rounded-full border text-xs font-black font-mono shadow-sm flex items-center gap-1 ${scoreBadgeColor}`}>
                          <Award size={11} />
                          <span>{score}/100</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition truncate">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 truncate">
                        by {item.mainCreator}
                      </p>

                      {/* Match Reasons Chips */}
                      {matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {matchReasons.map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 font-sans flex items-center gap-1"
                            >
                              <CheckCircle2 size={10} className="text-amber-400" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                    <span>Hornet Rating: <strong className="text-slate-100 font-mono">{item.hornetScore}/10</strong></span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTargetId(item.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-amber-400 hover:underline flex items-center gap-1 font-bold font-mono"
                    >
                      <span>Set as New Target</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
