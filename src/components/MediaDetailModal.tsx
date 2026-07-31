import React from 'react';
import { MediaItem, getScoreLevelInfo } from '../types';
import { HornetBadge } from './HornetBadge';
import { SmartImage } from './SmartImage';
import {
  X,
  Calendar,
  User,
  Users,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  Layers,
  Tag,
  Link as LinkIcon,
  Quote,
  Award,
  BookOpen,
  Info,
  Disc
} from 'lucide-react';

interface MediaDetailModalProps {
  item: MediaItem | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onCreatorClick?: (creatorName: string) => void;
  allItems?: MediaItem[];
  onSimilarClick?: (matchedItem: MediaItem) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  onTagClick,
  onCreatorClick,
  allItems = [],
  onSimilarClick,
}) => {
  if (!item) return null;

  const scoreInfo = getScoreLevelInfo(item.hornetScore);

  // Interconnected Soundtrack Resolution
  const isCurrentItemSoundtrack = item.mediaFormat === 'Music Album' && Boolean(item.isSoundtrack || item.soundtrackForId || item.soundtrackForTitle);

  const parentMediaEntry = React.useMemo(() => {
    if (!isCurrentItemSoundtrack) return null;
    if (item.soundtrackForId) {
      const found = allItems.find((i) => i.id === item.soundtrackForId);
      if (found) return found;
    }
    if (item.soundtrackForTitle) {
      const titleLower = item.soundtrackForTitle.toLowerCase().trim();
      const found = allItems.find((i) => i.title.toLowerCase().trim() === titleLower);
      if (found) return found;
    }
    return null;
  }, [item, isCurrentItemSoundtrack, allItems]);

  const soundtrackAlbumEntries = React.useMemo(() => {
    if (isCurrentItemSoundtrack) return [];
    
    // Collect candidate OST definitions
    const candidatesMap = new Map<string, { album?: MediaItem; title: string }>();

    // 1. Check item.soundtracks array
    if (item.soundtracks && item.soundtracks.length > 0) {
      item.soundtracks.forEach((st) => {
        if (st.id) {
          const found = allItems.find((i) => i.id === st.id);
          if (found) {
            candidatesMap.set(found.id, { album: found, title: found.title });
            return;
          }
        }
        if (st.title) {
          const found = allItems.find((i) => i.mediaFormat === 'Music Album' && i.title.toLowerCase().trim() === st.title.toLowerCase().trim());
          if (found) {
            candidatesMap.set(found.id, { album: found, title: found.title });
          } else {
            candidatesMap.set(`custom-${st.title}`, { title: st.title });
          }
        }
      });
    }

    // 2. Legacy fields
    if (item.soundtrackId) {
      const found = allItems.find((i) => i.id === item.soundtrackId);
      if (found && !candidatesMap.has(found.id)) {
        candidatesMap.set(found.id, { album: found, title: found.title });
      }
    } else if (item.soundtrackTitle) {
      const found = allItems.find((i) => i.mediaFormat === 'Music Album' && i.title.toLowerCase().trim() === item.soundtrackTitle!.toLowerCase().trim());
      if (found && !candidatesMap.has(found.id)) {
        candidatesMap.set(found.id, { album: found, title: found.title });
      } else if (!candidatesMap.has(`custom-${item.soundtrackTitle}`)) {
        candidatesMap.set(`custom-${item.soundtrackTitle}`, { title: item.soundtrackTitle });
      }
    }

    // 3. Reverse search for music albums in DB pointing to this item
    allItems.forEach((album) => {
      if (album.mediaFormat !== 'Music Album') return;
      if (album.soundtrackForId && album.soundtrackForId === item.id) {
        candidatesMap.set(album.id, { album, title: album.title });
      } else if (album.soundtrackForTitle && album.soundtrackForTitle.toLowerCase().trim() === item.title.toLowerCase().trim()) {
        candidatesMap.set(album.id, { album, title: album.title });
      }
    });

    return Array.from(candidatesMap.values());
  }, [item, isCurrentItemSoundtrack, allItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={13} /> ENTRY BIO INDEX
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-xs text-amber-300 font-semibold">
              {item.mediaFormat}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-xs text-slate-300 flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" /> {item.releaseDate}
            </span>
            {item.countryOfOrigin && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-xs text-amber-200/90 flex items-center gap-1">
                <span>Origin:</span>
                <span className="font-bold">{item.countryOfOrigin}</span>
              </span>
            )}
            {item.originalLanguage && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-xs text-cyan-200/90 flex items-center gap-1">
                <span>Lang:</span>
                <span className="font-bold">{item.originalLanguage}</span>
              </span>
            )}
            {item.consumedVersion && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 font-mono text-xs text-purple-300 flex items-center gap-1">
                <span>Consumed:</span>
                <span className="font-bold">{item.consumedVersion}</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Hero Header: PC Wallpaper Widescreen Image Banner */}
          <div className="space-y-4 bg-slate-950/90 p-4 sm:p-5 rounded-2xl border border-slate-800">
            {/* PC Wallpaper Frame (Aspect 16:9 / Widescreen Banner) */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
              <SmartImage
                src={item.cover}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
              
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight leading-snug drop-shadow-md">
                    {item.title}
                  </h1>
                </div>

                {/* Single Clean Rating Badge overlay on wallpaper */}
                <div className="shrink-0 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-lg">
                  <span className={`text-xl sm:text-2xl font-black font-mono ${scoreInfo.color}`}>
                    {item.hornetScore}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">/ 10</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase border ${scoreInfo.bgBadge}`}>
                    {scoreInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Creators & Verdict Row */}
            <div className="space-y-3 pt-1">
              {/* Creators Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono">
                <div
                  onClick={() => {
                    if (onCreatorClick) {
                      onClose();
                      const creatorNameOnly = item.mainCreator.split('/')[0].trim();
                      onCreatorClick(creatorNameOnly);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer font-bold"
                >
                  <User size={14} />
                  {item.mainCreator.includes('/') ? (
                    <>
                      <span>{item.mainCreator.split('/')[0].trim()}</span>
                      <span className="text-amber-400/70 text-[11px] font-normal">({item.mainCreator.split('/')[1].trim()})</span>
                    </>
                  ) : (
                    item.mainCreator
                  )}
                </div>

                {item.otherCreators && item.otherCreators.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.otherCreators.map((creator, i) => {
                      const nameOnly = creator.split('/')[0].trim();
                      const roleOnly = creator.includes('/') ? creator.split('/')[1].trim() : null;
                      return (
                        <span
                          key={i}
                          onClick={() => {
                            if (onCreatorClick) {
                              onClose();
                              onCreatorClick(nameOnly);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition cursor-pointer"
                        >
                          <Users size={12} className="text-slate-500" />
                          <span>{nameOnly}</span>
                          {roleOnly && <span className="text-slate-500 text-[10px]">({roleOnly})</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hornet Verdict Quote Box */}
              {item.hornetVerdict && (
                <div className="relative p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-indigo-950/20 border border-slate-800/80">
                  <Quote className="absolute top-2 right-2 text-amber-500/10" size={24} />
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                    <Award size={13} /> Hornet Verdict Summary
                  </div>
                  <p className="text-xs sm:text-sm italic font-serif leading-relaxed text-amber-100/90 pr-4">
                    "{item.hornetVerdict}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Controls bar inside modal */}
          {isAdmin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
              <span className="font-semibold flex items-center gap-1.5 font-mono">
                <Info size={14} /> Admin Controls Unlocked
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 transition"
                >
                  <Edit size={13} /> Edit Entry
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${item.title}" from the database?`)) {
                      onDelete(item.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-mono text-xs flex items-center gap-1 transition"
                >
                  <Trash2 size={13} /> Delete Entry
                </button>
              </div>
            </div>
          )}

          {/* Interconnected Soundtrack Section (Only shown if soundtrack exists/is linked) */}
          {isCurrentItemSoundtrack && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2.5 font-mono">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Disc size={15} className="text-purple-400" /> Soundtrack For Media Entry
              </div>
              {parentMediaEntry ? (
                <div
                  onClick={() => {
                    if (onSimilarClick) {
                      onSimilarClick(parentMediaEntry);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-purple-800/80 hover:border-purple-400 cursor-pointer transition group shadow-md"
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                    <SmartImage src={parentMediaEntry.cover} alt={parentMediaEntry.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition truncate">
                      {parentMediaEntry.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                      {parentMediaEntry.mediaFormat} • {parentMediaEntry.mainCreator} ({parentMediaEntry.releaseDate?.substring(0, 4)})
                    </div>
                  </div>
                  <HornetBadge score={parentMediaEntry.hornetScore} size="sm" />
                </div>
              ) : (
                <div className="text-xs text-purple-200 font-sans bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-800/40">
                  Official Soundtrack for <span className="font-mono font-bold text-amber-300">{item.soundtrackForTitle || 'Main Media Entry'}</span>
                </div>
              )}
            </div>
          )}

          {!isCurrentItemSoundtrack && soundtrackAlbumEntries.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-2.5 font-mono">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Disc size={15} className="text-amber-400" /> Official Soundtrack {soundtrackAlbumEntries.length > 1 ? 'Albums' : 'Album'} ({soundtrackAlbumEntries.length})
              </div>
              <div className="space-y-2">
                {soundtrackAlbumEntries.map((st, idx) => {
                  if (st.album) {
                    return (
                      <div
                        key={st.album.id || idx}
                        onClick={() => {
                          if (onSimilarClick && st.album) {
                            onSimilarClick(st.album);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-indigo-800/80 hover:border-amber-400 cursor-pointer transition group shadow-md"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                          <SmartImage src={st.album.cover} alt={st.album.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition truncate">
                            {st.album.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                            Composed & Performed by {st.album.mainCreator}
                          </div>
                        </div>
                        <HornetBadge score={st.album.hornetScore} size="sm" />
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="text-xs text-indigo-200 font-sans bg-indigo-900/30 px-3 py-2 rounded-lg border border-indigo-800/40">
                      Official Soundtrack: <span className="font-mono font-bold text-amber-300">{st.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Plot / Premise */}
          {item.summaryPlot && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-xs uppercase tracking-wider font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <BookOpen size={14} /> Summary Plot & Premise
              </div>
              <p className="text-xs sm:text-sm font-sans text-slate-300 leading-relaxed">
                {item.summaryPlot}
              </p>
            </div>
          )}

          {/* Philosophical & Genre Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Philosophical Spectrum */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Tag size={14} /> Philosophical Spectrum
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.philosophicalTags && item.philosophicalTags.length > 0 ? (
                  item.philosophicalTags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onTagClick(tag);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60 transition cursor-pointer"
                      title={`Filter by tag: ${tag}`}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No philosophical tags assigned.</span>
                )}
              </div>
            </div>

            {/* Genres & Style Tags */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Layers size={14} /> Genres & Style Attributes
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.genres?.map((g, idx) => (
                  <button
                    key={`g-${idx}`}
                    onClick={() => {
                      onTagClick(g);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/50 transition"
                  >
                    {g}
                  </button>
                ))}
                {item.genreStyleTags?.map((st, idx) => (
                  <button
                    key={`st-${idx}`}
                    onClick={() => {
                      onTagClick(st);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dual Columns: Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/20 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Key Strengths (Pros)
              </h4>
              <ul className="space-y-2 pt-1 text-xs sm:text-sm text-slate-300">
                {item.pros && item.pros.length > 0 ? (
                  item.pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                      <span>{pro}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic font-mono text-xs">None listed</li>
                )}
              </ul>
            </div>

            {/* Cons */}
            <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/20 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <XCircle size={15} /> Critiques & Flaws (Cons)
              </h4>
              <ul className="space-y-2 pt-1 text-xs sm:text-sm text-slate-300">
                {item.cons && item.cons.length > 0 ? (
                  item.cons.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                      <span>{con}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic font-mono text-xs">None listed</li>
                )}
              </ul>
            </div>
          </div>

          {/* Medium Influences & Similar Media Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            {/* Medium Influences */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Quote size={14} /> Medium Influences & Name-Drops
              </h4>
              <div className="flex flex-col gap-2">
                {item.mediumInfluences && item.mediumInfluences.length > 0 ? (
                  item.mediumInfluences.map((inf, idx) => {
                    const titleStr = typeof inf === 'string' ? inf : inf.title;
                    const customCover = typeof inf === 'object' ? inf.customCover : undefined;
                    const matched = allItems.find(
                      (i) => i.title.toLowerCase().trim() === titleStr.toLowerCase().trim()
                    );

                    if (matched) {
                      return (
                        <div
                          key={`inf-matched-${idx}`}
                          onClick={() => {
                            if (onSimilarClick) {
                              onSimilarClick(matched);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                            <SmartImage
                              src={matched.cover}
                              alt={matched.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 font-mono truncate">
                              {matched.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{matched.mediaFormat}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{matched.hornetScore}/10</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Bio Linked
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`inf-raw-${idx}`}
                        onClick={() => {
                          if (onCreatorClick) {
                            onClose();
                            onCreatorClick(titleStr);
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-300 ${
                          onCreatorClick ? 'hover:bg-slate-800 hover:border-amber-500/40 cursor-pointer transition group' : ''
                        }`}
                      >
                        {customCover ? (
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                            <SmartImage src={customCover} alt={titleStr} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-amber-400/60 font-bold text-sm">
                            {titleStr.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-200 group-hover:text-amber-300 truncate">{titleStr}</div>
                          <div className="text-[10px] text-slate-500 italic">
                            {onCreatorClick ? 'Click to search / view Creator Bio' : 'Influence entry'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No medium influences listed.</span>
                )}
              </div>
            </div>

            {/* Similar Media */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                <Award size={14} /> Similar Media & Echoes
              </h4>
              <div className="flex flex-col gap-2">
                {item.similarMedia && item.similarMedia.length > 0 ? (
                  item.similarMedia.map((sim, idx) => {
                    const titleStr = typeof sim === 'string' ? sim : sim.title;
                    const customCover = typeof sim === 'object' ? sim.customCover : undefined;
                    const matched = allItems.find(
                      (i) => i.title.toLowerCase().trim() === titleStr.toLowerCase().trim()
                    );

                    if (matched) {
                      return (
                        <div
                          key={`sim-matched-${idx}`}
                          onClick={() => {
                            if (onSimilarClick) {
                              onSimilarClick(matched);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400/60 transition cursor-pointer group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                            <SmartImage
                              src={matched.cover}
                              alt={matched.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 font-mono truncate">
                              {matched.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{matched.mediaFormat}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{matched.hornetScore}/10</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Inspect
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`sim-raw-${idx}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-300"
                      >
                        {customCover ? (
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                            <SmartImage src={customCover} alt={titleStr} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400/60 font-bold text-sm">
                            {titleStr.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-200 truncate">{titleStr}</div>
                          <div className="text-[10px] text-slate-500 italic">Uncataloged media</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No similar media logged.</span>
                )}
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <LinkIcon size={12} /> Reference Links
            </h4>
            <div className="flex flex-wrap gap-2">
              {item.links && item.links.length > 0 ? (
                item.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-mono font-medium transition shadow-sm"
                  >
                    <span>{link.label}</span>
                    <ExternalLink size={12} />
                  </a>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic font-mono">No external links attached.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
