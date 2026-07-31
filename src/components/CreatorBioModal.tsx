import React, { useState, useEffect, useMemo } from 'react';
import { MediaItem, CreatorCategory, BandMember, CreatorDetails } from '../types';
import { X, ExternalLink, Tag, BookOpen, User, Layers, Film, Music, Palette, Gamepad2, Building2, Code, Users, Disc } from 'lucide-react';
import { SmartImage } from './SmartImage';

interface CreatorBioModalProps {
  creatorName: string | null;
  category?: CreatorCategory;
  allItems: MediaItem[];
  onClose: () => void;
  onItemClick: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
}

interface WikiData {
  title?: string;
  extract?: string;
  description?: string;
  thumbnailUrl?: string;
  contentUrl?: string;
}

// Helper to sanitize bio text from Wikipedia so age-bound statements don't age badly
function sanitizeBioExtract(extract?: string, nation?: string | null): string {
  if (!extract) return 'No article extract available.';

  let text = extract;

  // Remove age-bound or current status phrases that age poorly
  text = text.replace(/\b(is|was) currently \d+ years old\b/gi, '');
  text = text.replace(/\b(is|was) \d+ years old\b/gi, '');
  text = text.replace(/\b\d+-year-old\b/gi, '');
  text = text.replace(/\bas of \d{4},?\b/gi, '');
  text = text.replace(/\bcurrently\b/gi, '');

  // Normalize whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();

  // Ensure nationality information is explicitly attached if provided
  if (nation && nation !== 'N/A' && nation !== 'Unknown') {
    const nationLower = nation.toLowerCase();
    if (!text.toLowerCase().includes(nationLower)) {
      text = `[Origin: ${nation}] ${text}`;
    }
  }

  return text;
}

export const CreatorBioModal: React.FC<CreatorBioModalProps> = ({
  creatorName,
  category: initialCategory,
  allItems,
  onClose,
  onItemClick,
  onTagClick,
}) => {
  const [currentCreator, setCurrentCreator] = useState<string | null>(creatorName);
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync state if prop changes
  useEffect(() => {
    setCurrentCreator(creatorName);
  }, [creatorName]);

  // Determine effective category & Band status
  const effectiveCategory = useMemo<CreatorCategory>(() => {
    if (!currentCreator) return initialCategory || 'Other';
    const q = currentCreator.toLowerCase().trim();

    // Check if matching detail in any item declares it as Band
    for (const item of allItems) {
      const detail = item.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === q);
      if (detail?.category) return detail.category;
    }

    return initialCategory || 'Other';
  }, [currentCreator, initialCategory, allItems]);

  const isBand = effectiveCategory === 'Band';

  // Find Nation if available
  const creatorNation = useMemo(() => {
    if (!currentCreator) return null;
    const q = currentCreator.toLowerCase().trim();
    for (const item of allItems) {
      const detail = item.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === q);
      if (detail?.nation) return detail.nation;
    }
    return null;
  }, [currentCreator, allItems]);

  // Auto-fetch Wikipedia summary whenever currentCreator changes
  useEffect(() => {
    if (!currentCreator) {
      setWikiData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const cleanName = currentCreator.split('/')[0].trim();

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Wikipedia article not found directly');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const rawExtract = data.extract || 'No article extract available.';
        const sanitized = sanitizeBioExtract(rawExtract, creatorNation);

        setWikiData({
          title: data.title || cleanName,
          extract: sanitized,
          description: data.description || '',
          thumbnailUrl: data.thumbnail?.source || data.originalimage?.source || null,
          contentUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Wiki fetch error:', err);
        const fallbackBio = `${cleanName} is a recognized creator logged in Hornet's media archive.`;
        setWikiData({
          title: cleanName,
          extract: sanitizeBioExtract(fallbackBio, creatorNation),
          contentUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`,
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentCreator, creatorNation]);

  // Find all items in archive connected to currentCreator
  const catalogItems = useMemo(() => {
    if (!currentCreator) return [];
    const q = currentCreator.toLowerCase().trim();

    return allItems.filter((item) => {
      if (isBand) {
        const mainMatch = item.mainCreator?.toLowerCase().trim().includes(q);
        const otherMatch = item.otherCreators?.some((c) => c.toLowerCase().trim().includes(q));
        const detailsMatch = item.creatorDetails?.some(
          (cd) => cd.category === 'Band' && cd.name.toLowerCase().trim().includes(q)
        );
        return mainMatch || otherMatch || detailsMatch;
      }

      // Individual Person filtering (ONLY include products where member worked):
      const mainMatch = item.mainCreator?.toLowerCase().trim().includes(q);
      const otherMatch = item.otherCreators?.some((c) => c.toLowerCase().trim().includes(q));
      const detailsMatch = item.creatorDetails?.some((cd) => {
        if (cd.category !== 'Band' && cd.name.toLowerCase().trim().includes(q)) {
          return true;
        }
        if (cd.category === 'Band' && cd.bandMembers) {
          return cd.bandMembers.some(
            (m) => m.name.toLowerCase().trim() === q && m.participatedInProduct !== false
          );
        }
        return false;
      });

      return mainMatch || otherMatch || detailsMatch;
    });
  }, [currentCreator, isBand, allItems]);

  // If this creator is a Band, collect ALL unique members across ALL band items in database
  const bandRoster = useMemo<BandMember[]>(() => {
    if (!currentCreator || !isBand) return [];
    const q = currentCreator.toLowerCase().trim();
    const map = new Map<string, BandMember>();

    allItems.forEach((item) => {
      item.creatorDetails?.forEach((cd) => {
        if (cd.category === 'Band' && cd.name.toLowerCase().trim() === q && cd.bandMembers) {
          cd.bandMembers.forEach((m) => {
            const memberKey = m.name.toLowerCase().trim();
            if (memberKey && !map.has(memberKey)) {
              map.set(memberKey, m);
            }
          });
        }
      });
    });

    return Array.from(map.values());
  }, [currentCreator, isBand, allItems]);

  // If this creator is an individual, find their Band affiliations
  const bandAffiliations = useMemo(() => {
    if (!currentCreator || isBand) return [];
    const q = currentCreator.toLowerCase().trim();
    const map = new Map<string, { bandName: string; role: string }>();

    allItems.forEach((item) => {
      item.creatorDetails?.forEach((cd) => {
        if (cd.category === 'Band' && cd.bandMembers) {
          const found = cd.bandMembers.find((m) => m.name.toLowerCase().trim() === q);
          if (found) {
            const bandKey = cd.name.toLowerCase().trim();
            if (!map.has(bandKey)) {
              map.set(bandKey, {
                bandName: cd.name,
                role: found.bandRole || found.productRole || 'Member'
              });
            }
          }
        }
      });
    });

    return Array.from(map.values());
  }, [currentCreator, isBand, allItems]);

  // Associated Tags
  const associatedTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    catalogItems.forEach((item) => {
      item.philosophicalTags?.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
      item.genreStyleTags?.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
  }, [catalogItems]);

  const getCategoryIcon = (cat?: CreatorCategory) => {
    switch (cat) {
      case 'Band':
        return <Users size={16} className="text-amber-400" />;
      case 'Music Artist':
        return <Music size={16} className="text-emerald-400" />;
      case 'Author':
        return <BookOpen size={16} className="text-amber-400" />;
      case 'Director':
        return <Film size={16} className="text-cyan-400" />;
      case 'Painter':
      case 'Production Artist':
        return <Palette size={16} className="text-purple-400" />;
      case 'Game Designer':
        return <Gamepad2 size={16} className="text-amber-400" />;
      case 'Developer':
        return <Code size={16} className="text-blue-400" />;
      case 'Studio / Company':
        return <Building2 size={16} className="text-indigo-400" />;
      default:
        return <User size={16} className="text-slate-400" />;
    }
  };

  if (!currentCreator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition z-20"
        >
          <X size={20} />
        </button>

        {/* Header Hero */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-b border-slate-800 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Creator Photo / Portrait */}
            {wikiData?.thumbnailUrl ? (
              <SmartImage
                src={wikiData.thumbnailUrl}
                alt={currentCreator}
                className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-2xl object-cover border-2 border-amber-500/50 shadow-2xl shrink-0 ring-4 ring-slate-950"
              />
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-center text-slate-600 shrink-0 shadow-2xl ring-4 ring-slate-950">
                {isBand ? <Users size={64} className="text-amber-400/80" /> : <User size={64} />}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
                  {getCategoryIcon(effectiveCategory)}
                  <span>{effectiveCategory || 'Creator / Artist'}</span>
                </div>
                {creatorNation && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
                    <span>Nation:</span>
                    <span>{creatorNation}</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
                {wikiData?.title || currentCreator}
              </h2>

              {wikiData?.description && (
                <p className="text-xs font-mono text-amber-400/90 capitalize">
                  {wikiData.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 font-sans">
          {/* Biography & Wikipedia Integration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={16} className="text-amber-400" /> Biography & Background
              </h3>
              {wikiData?.contentUrl && (
                <a
                  href={wikiData.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Wikipedia Page</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {loading ? (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Pulling biography from Wikipedia...</span>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed font-sans">
                {wikiData?.extract}
              </div>
            )}
          </div>

          {/* IF BAND: SHOW BAND ROSTER / MEMBERS */}
          {isBand && bandRoster.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30">
              <h3 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-amber-400" /> Band Members & Roster ({bandRoster.length})
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Click any member to inspect their individual biography and specific discography history.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {bandRoster.map((member, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentCreator(member.name)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-950 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold font-mono text-xs">
                        {member.name.substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-100 group-hover:text-amber-300 transition">
                          {member.name}
                        </h4>
                        <p className="text-[11px] font-mono text-amber-400/90">
                          {member.bandRole || 'Musician'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400 transition">
                      View Bio →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IF INDIVIDUAL: SHOW BAND AFFILIATIONS */}
          {!isBand && bandAffiliations.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
              <h3 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-amber-400" /> Band History & Affiliations
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {bandAffiliations.map((aff, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentCreator(aff.bandName)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 hover:border-amber-400 flex items-center gap-2 cursor-pointer transition group"
                  >
                    <Users size={14} className="text-amber-400 shrink-0" />
                    <div className="text-xs font-mono">
                      <span className="text-slate-400">Member of </span>
                      <span className="text-amber-300 font-bold group-hover:underline">{aff.bandName}</span>
                      <span className="text-slate-400"> ({aff.role})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Tags */}
          {associatedTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Tag size={14} className="text-amber-400" /> Associated Philosophical & Style Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {associatedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onClose();
                      onTagClick(tag);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-amber-300 font-mono text-xs transition"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Creator Catalog / Discography */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-amber-400" /> Logged Works in Archive
              </h3>
              <span className="text-xs font-mono text-slate-400">({catalogItems.length})</span>
            </div>

            {catalogItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {catalogItems.map((item) => {
                  const q = currentCreator.toLowerCase().trim();

                  // Determine Band info & specific role formatting
                  let bandNameForWork: string | null = null;
                  let artistRoleForWork: string | null = null;
                  let participatingLineup: BandMember[] = [];

                  // Search creatorDetails
                  item.creatorDetails?.forEach((cd) => {
                    if (cd.category === 'Band' && cd.bandMembers) {
                      participatingLineup = cd.bandMembers;
                      const memberMatch = cd.bandMembers.find((m) => m.name.toLowerCase().trim() === q);
                      if (memberMatch) {
                        bandNameForWork = cd.name;
                        artistRoleForWork = memberMatch.productRole || memberMatch.bandRole || 'Musician';
                      }
                    } else if (cd.name.toLowerCase().trim() === q) {
                      artistRoleForWork = cd.category;
                    }
                  });

                  if (!artistRoleForWork) {
                    if (item.mainCreator?.toLowerCase().includes(q) && item.mainCreator.includes('/')) {
                      artistRoleForWork = item.mainCreator.split('/')[1]?.trim() || null;
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onClose();
                        onItemClick(item);
                      }}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SmartImage
                          src={item.cover}
                          alt={item.title}
                          className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl object-cover flex-shrink-0 bg-slate-900"
                        />
                        <div className="min-w-0 space-y-1">
                          {/* Formatting: "x product with y band as v role" */}
                          <h4 className="text-sm font-bold font-mono text-slate-100 group-hover:text-amber-300">
                            {item.title}
                            {bandNameForWork && (
                              <span className="text-amber-400 font-normal ml-1">
                                with <span className="font-bold underline">{bandNameForWork}</span>
                              </span>
                            )}
                            {artistRoleForWork && (
                              <span className="text-slate-400 font-normal text-xs ml-1.5">
                                as <span className="text-amber-300 font-semibold">{artistRoleForWork}</span>
                              </span>
                            )}
                          </h4>

                          <p className="text-xs font-mono text-slate-400">
                            {item.mediaFormat} ({item.releaseDate ? item.releaseDate.substring(0, 4) : 'N/A'}) • Rated <span className="text-amber-400 font-bold">{item.hornetScore}/10</span>
                          </p>

                          {/* If viewing a Band's work, show the participating lineup */}
                          {isBand && participatingLineup.length > 0 && (
                            <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-500">Lineup on this work:</span>
                              {participatingLineup.map((m, mIdx) => {
                                const participated = m.participatedInProduct !== false;
                                return (
                                  <span
                                    key={mIdx}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                      participated
                                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                                        : 'bg-slate-900 text-slate-600 border-slate-800 line-through'
                                    }`}
                                  >
                                    {m.name} ({m.productRole || m.bandRole})
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-amber-500/40 text-xs font-mono text-amber-400">
                          Inspect →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">No works currently registered in this database for {currentCreator}.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
