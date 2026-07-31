import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { MediaItem, FilterOptions } from './types';
import { extractReleaseYear, getDecadeFromYear } from './utils/dateUtils';
import { storageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { HeroRandomFeatured } from './components/HeroRandomFeatured';
import { AdvancedFilterPanel } from './components/AdvancedFilterPanel';
import { MediaCard } from './components/MediaCard';
import { MediaDetailModal } from './components/MediaDetailModal';
import { PasscodeModal } from './components/PasscodeModal';
import { AdminMediaModal } from './components/AdminMediaModal';
import { AdminToolsDrawer } from './components/AdminToolsDrawer';
import { RatingScalePage } from './components/RatingScalePage';
import { HornetsPage } from './components/HornetsPage';
import { SimilarItemsPage } from './components/SimilarItemsPage';
import { CreatorBioModal } from './components/CreatorBioModal';
import { GlobalTagModal } from './components/GlobalTagModal';
import { ShieldCheck, Plus, Layers, Lock, Database } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Active Navigation View
  const [activeView, setActiveView] = useState<'archive' | 'hornets' | 'rating_scale' | 'similar'>('archive');

  // Modals & Drawers State
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedCreatorForBio, setSelectedCreatorForBio] = useState<string | null>(null);
  const [selectedTagForBio, setSelectedTagForBio] = useState<string | null>(null);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isAdminMediaModalOpen, setIsAdminMediaModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MediaItem | null>(null);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);

  // Filter options state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    formats: [],
    selectedGenres: [],
    selectedPhilosophicalTags: [],
    selectedStyleTags: [],
    selectedConsumedVersions: [],
    selectedDecades: [],
    selectedCountries: [],
    selectedLanguages: [],
    minScore: 0,
    maxScore: 10,
    releaseYearStart: null,
    releaseYearEnd: null,
    tagLogic: 'OR',
    sortBy: 'random'
  });

  // Fetch items on mount
  useEffect(() => {
    storageService.fetchMediaItems().then((fetchedItems) => {
      setItems(fetchedItems);
    });
  }, []);

  // Compute all unique philosophical tags and style tags across current database
  const allPhilosophicalTags = useMemo(() => {
    return Array.from(new Set(items.flatMap((i) => i.philosophicalTags || []))).sort();
  }, [items]);

  const allStyleTags = useMemo(() => {
    return Array.from(
      new Set([
        ...items.flatMap((i) => i.genres || []),
        ...items.flatMap((i) => i.genreStyleTags || [])
      ])
    ).sort();
  }, [items]);

  // Performance Optimization: Defer search query calculation to prevent UI clunkiness
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);
  const [visibleCount, setVisibleCount] = useState<number>(48);

  // Reset pagination when filter parameters change
  useEffect(() => {
    setVisibleCount(48);
  }, [filters, items.length]);

  // Filter & Sort Logic
  const filteredItems = useMemo(() => {
    const normalizeText = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    return items.filter((item) => {
      // 1. Search Query
      if (deferredSearchQuery.trim() !== '') {
        const queryClean = deferredSearchQuery.trim().toLowerCase();
        if (queryClean === 'fourward') {
          // Passcode secret query, handled by Navbar
          return true;
        }

        const normQuery = normalizeText(queryClean);
        const terms = normQuery.split(/\s+/).filter(Boolean);

        const rawCorpus = [
          item.title || '',
          item.mainCreator || '',
          ...(item.otherCreators || []),
          item.mediaFormat || '',
          item.releaseDate || '',
          item.consumedVersion || '',
          item.countryOfOrigin || '',
          item.originalLanguage || '',
          item.hornetVerdict || '',
          item.summaryPlot || '',
          `${item.hornetScore}`,
          `${item.hornetScore}/10`,
          `${Math.round(item.hornetScore)}`,
          ...(item.genres || []),
          ...(item.philosophicalTags || []),
          ...(item.genreStyleTags || []),
          ...(item.pros || []),
          ...(item.cons || []),
          ...(item.similarMedia || []).map((sm) => (typeof sm === 'string' ? sm : sm.title)),
          ...(item.mediumInfluences || []).map((mi) => (typeof mi === 'string' ? mi : mi.title)),
          ...(item.creatorDetails || []).flatMap((cd) => [
            cd.name || '',
            cd.category || '',
            cd.nation || '',
            ...(cd.bandMembers || []).flatMap((bm) => [bm.name || '', bm.bandRole || ''])
          ])
        ].join(' ');

        const corpus = normalizeText(rawCorpus);

        const matchesAllTerms = terms.every((term) => corpus.includes(term));
        if (!matchesAllTerms) {
          return false;
        }
      }

      // 2. Media Formats
      if (filters.formats.length > 0) {
        if (!filters.formats.includes(item.mediaFormat)) {
          return false;
        }
      }

      // 3. Hornet Score Range (0 to 10)
      if (item.hornetScore < filters.minScore || item.hornetScore > filters.maxScore) {
        return false;
      }

      // 3.5. Release Year & Decade Filtering
      const itemYear = extractReleaseYear(item.releaseDate);

      if (filters.releaseYearStart !== null && filters.releaseYearStart > 0) {
        if (itemYear === null || itemYear < filters.releaseYearStart) return false;
      }

      if (filters.releaseYearEnd !== null && filters.releaseYearEnd > 0) {
        if (itemYear === null || itemYear > filters.releaseYearEnd) return false;
      }

      if (filters.selectedDecades && filters.selectedDecades.length > 0) {
        if (itemYear === null) return false;
        const itemDecade = getDecadeFromYear(itemYear);
        if (!filters.selectedDecades.includes(itemDecade)) return false;
      }

      // 4. Philosophical Tags Filtering
      if (filters.selectedPhilosophicalTags.length > 0) {
        const itemTags = item.philosophicalTags || [];
        if (filters.tagLogic === 'AND') {
          const hasAll = filters.selectedPhilosophicalTags.every((st) => itemTags.includes(st));
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedPhilosophicalTags.some((st) => itemTags.includes(st));
          if (!hasAny) return false;
        }
      }

      // 5. Style & Genre Tags Filtering
      if (filters.selectedStyleTags.length > 0) {
        const itemStyles = [...(item.genres || []), ...(item.genreStyleTags || [])];
        if (filters.tagLogic === 'AND') {
          const hasAll = filters.selectedStyleTags.every((st) => itemStyles.includes(st));
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedStyleTags.some((st) => itemStyles.includes(st));
          if (!hasAny) return false;
        }
      }

      // 6. Consumed Version / Platform Filtering
      if (filters.selectedConsumedVersions && filters.selectedConsumedVersions.length > 0) {
        if (!item.consumedVersion || !filters.selectedConsumedVersions.includes(item.consumedVersion)) {
          return false;
        }
      }

      // 7. Country of Origin Filtering
      if (filters.selectedCountries && filters.selectedCountries.length > 0) {
        if (!item.countryOfOrigin || !filters.selectedCountries.includes(item.countryOfOrigin)) {
          return false;
        }
      }

      // 8. Original Language Filtering
      if (filters.selectedLanguages && filters.selectedLanguages.length > 0) {
        if (!item.originalLanguage || !filters.selectedLanguages.includes(item.originalLanguage)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (filters.sortBy) {
        case 'score_desc':
          return b.hornetScore - a.hornetScore;
        case 'score_asc':
          return a.hornetScore - b.hornetScore;
        case 'release_desc':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'release_asc':
          return (a.releaseDate || '').localeCompare(b.releaseDate || '');
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date_added':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'random':
        default:
          return 0;
      }
    });
  }, [items, filters]);

  // Handlers
  const handleSaveMedia = async (newItem: MediaItem) => {
    setIsSaving(true);
    setSaveStatusMessage('Submitting to serverless function /api/add-item...');
    try {
      // Bi-directional link update: if this album is a soundtrack for a parent media item in DB
      if (newItem.mediaFormat === 'Music Album' && newItem.isSoundtrack && newItem.soundtrackForId) {
        const parentIdx = items.findIndex((i) => i.id === newItem.soundtrackForId);
        if (parentIdx >= 0) {
          const parentItem = items[parentIdx];
          const existingSoundtracks = parentItem.soundtracks || [];
          const alreadyLinked = existingSoundtracks.some((s) => s.id === newItem.id || s.title.toLowerCase().trim() === newItem.title.toLowerCase().trim());
          const updatedSoundtracks = alreadyLinked
            ? existingSoundtracks.map((s) => (s.id === newItem.id ? { id: newItem.id, title: newItem.title } : s))
            : [...existingSoundtracks, { id: newItem.id, title: newItem.title }];

          const updatedParent: MediaItem = {
            ...parentItem,
            soundtracks: updatedSoundtracks,
            soundtrackId: updatedSoundtracks[0]?.id || newItem.id,
            soundtrackTitle: updatedSoundtracks[0]?.title || newItem.title,
            updatedAt: new Date().toISOString()
          };
          // Persist parent update first
          await storageService.addItemServer(updatedParent, adminPasscode);
        }
      }

      const result = await storageService.addItemServer(newItem, adminPasscode);
      setItems(result.items);
      setItemToEdit(null);
      setSaveStatusMessage(result.message || 'Saved successfully');
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving item:', err);
      setSaveStatusMessage(`Error: ${err.message || 'Failed to save'}`);
      setTimeout(() => setSaveStatusMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    setIsSaving(true);
    setSaveStatusMessage('Deleting item and updating server archive.json...');
    try {
      const result = await storageService.deleteMediaItemServer(id, adminPasscode);
      setItems(result.items);
      setSaveStatusMessage('Item deleted from archive.json');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setSaveStatusMessage(`Delete error: ${err.message}`);
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsAdminMediaModalOpen(true);
  };

  const handleOpenEditModal = (item: MediaItem) => {
    setItemToEdit(item);
    setIsAdminMediaModalOpen(true);
  };

  const handleTagClickFromCardOrModal = (tag: string) => {
    setSelectedTagForBio(tag);
  };

  const handleRenameTagGlobally = async (oldTag: string, newTag: string) => {
    const oldNorm = oldTag.toLowerCase().trim();
    const updatedItems = items.map((item) => {
      let modified = false;
      const philo = (item.philosophicalTags || []).map((t) => {
        if (t.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag;
        }
        return t;
      });
      const styles = (item.genreStyleTags || []).map((t) => {
        if (t.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag;
        }
        return t;
      });
      const genres = (item.genres || []).map((g) => {
        if (g.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag;
        }
        return g;
      });

      if (modified) {
        return {
          ...item,
          philosophicalTags: Array.from(new Set(philo)),
          genreStyleTags: Array.from(new Set(styles)),
          genres: Array.from(new Set(genres))
        };
      }
      return item;
    });

    setItems(updatedItems);
    await storageService.saveArchiveServer(updatedItems, adminPasscode);
  };

  const handleDeleteTagGlobally = async (tagToDelete: string) => {
    const q = tagToDelete.toLowerCase().trim();
    const updatedItems = items.map((item) => ({
      ...item,
      philosophicalTags: (item.philosophicalTags || []).filter((t) => t.toLowerCase().trim() !== q),
      genreStyleTags: (item.genreStyleTags || []).filter((t) => t.toLowerCase().trim() !== q),
      genres: (item.genres || []).filter((g) => g.toLowerCase().trim() !== q)
    }));

    setItems(updatedItems);
    await storageService.saveArchiveServer(updatedItems, adminPasscode);
  };

  const handleCreatorClick = (creatorName: string) => {
    setSelectedCreatorForBio(creatorName);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      {/* Admin Mode Floating Indicator Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 py-1.5 px-4 text-xs font-mono font-bold flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} /> ADMIN MODE UNLOCKED • Serverless API /api/add-item ready
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className="bg-slate-950 hover:bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus size={12} /> Add Item
              </button>
              <button
                onClick={() => setIsAdminToolsOpen(true)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-200 px-2.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition"
              >
                <Database size={12} /> DB Manager
              </button>
              <button
                onClick={() => setIsAdmin(false)}
                className="hover:underline text-slate-900 text-[11px] flex items-center gap-1"
              >
                <Lock size={12} /> Exit Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Status Banner Notification */}
      {saveStatusMessage && (
        <div className="bg-slate-900 border-b border-amber-500/50 text-amber-300 px-4 py-2 text-center text-xs font-mono animate-fade-in flex items-center justify-center gap-2">
          {isSaving && <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
          <span>{saveStatusMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        items={items}
        isAdmin={isAdmin}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
        onOpenAddModal={handleOpenAddModal}
        onOpenAdminTools={() => setIsAdminToolsOpen(true)}
        onLockAdmin={() => setIsAdmin(false)}
        onRandomizeClick={() => {
          setActiveView('archive');
          setFilters((prev) => ({ ...prev, sortBy: 'random' }));
        }}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => {
          if (activeView !== 'archive') setActiveView('archive');
          setFilters((prev) => ({ ...prev, searchQuery: q }));
        }}
      />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-5">
        {activeView === 'archive' && (
          <>
            {/* Hero Section: Randomized Featured Cards (Hidden when searching to bring results to top) */}
            {filters.searchQuery.trim() === '' && (
              <HeroRandomFeatured
                items={items}
                onItemClick={(item) => setSelectedMedia(item)}
                onTagClick={handleTagClickFromCardOrModal}
              />
            )}

            {/* Advanced Filter Panel */}
            <AdvancedFilterPanel
              filters={filters}
              onChange={setFilters}
              allItems={items}
              matchingCount={filteredItems.length}
            />

            {/* Active Search Indicator Banner */}
            {filters.searchQuery.trim() !== '' && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    Searching for <strong className="text-amber-300">"{filters.searchQuery}"</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-amber-500/30 text-amber-400 font-bold">
                    {filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                >
                  Clear Search ✕
                </button>
              </div>
            )}

            {/* Media Archive Grid Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black font-mono tracking-wider text-slate-100 flex items-center gap-1.5 uppercase">
                  <Layers size={16} className="text-amber-400" />
                  ARCHIVE INDEX
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({filteredItems.length} / {items.length} logged)
                </span>
              </div>

              {isAdmin && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 transition shadow"
                >
                  <Plus size={13} /> Add Media
                </button>
              )}
            </div>

            {/* Media Grid with Virtualized/Batched Slice for High Performance */}
            {filteredItems.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredItems.slice(0, visibleCount).map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onClick={(i) => setSelectedMedia(i)}
                      onTagClick={handleTagClickFromCardOrModal}
                      onCreatorClick={handleCreatorClick}
                    />
                  ))}
                </div>

                {filteredItems.length > visibleCount && (
                  <div className="flex flex-col items-center justify-center pt-2 pb-6">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 48)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-amber-500/40 transition shadow-lg flex items-center gap-2 group cursor-pointer"
                    >
                      <span>Load More Entries</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-normal">
                        {visibleCount} / {filteredItems.length}
                      </span>
                    </button>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      High-performance batching enabled for ultra-fast rendering.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#0e1117] rounded-xl border border-slate-800/90 p-6">
                <Database className="mx-auto text-amber-500/50 mb-2" size={32} />
                <h3 className="text-sm font-mono font-bold text-slate-200 uppercase">
                  {items.length === 0 ? 'Archive Is Empty' : 'No Items Match Active Filters'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-3 font-mono">
                  {items.length === 0
                    ? 'Use secret admin controls to log new entries.'
                    : 'Adjust tag filters, formats, or search queries.'}
                </p>
                {items.length > 0 && (
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        formats: [],
                        selectedGenres: [],
                        selectedPhilosophicalTags: [],
                        selectedStyleTags: [],
                        selectedConsumedVersions: [],
                        selectedDecades: [],
                        minScore: 0,
                        maxScore: 10,
                        releaseYearStart: null,
                        releaseYearEnd: null,
                        tagLogic: 'OR',
                        sortBy: 'random'
                      })
                    }
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Hornet's Page View */}
        {activeView === 'hornets' && (
          <HornetsPage
            items={items}
            onItemClick={(item) => {
              setActiveView('archive');
              setSelectedMedia(item);
            }}
            onTagClick={handleTagClickFromCardOrModal}
            onCreatorClick={handleCreatorClick}
          />
        )}

        {/* Rating Scale Page View */}
        {activeView === 'rating_scale' && <RatingScalePage />}

        {/* Similar Search Page View */}
        {activeView === 'similar' && (
          <SimilarItemsPage
            items={items}
            onItemClick={(item) => setSelectedMedia(item)}
            onTagClick={handleTagClickFromCardOrModal}
            onCreatorClick={handleCreatorClick}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-slate-400 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <p className="font-bold text-slate-200">MEDIUM ARCHIVE</p>
            <p className="text-[11px] text-slate-400 max-w-md font-sans">
              A personal repository logging experienced films, games, books, music, and television. Evaluated strictly on subjective artistic resonance rather than commercial acclaim.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>Hornet's 10-Point Scale</span>
          </div>
        </div>
      </footer>

      {/* Modals & Overlay Components */}
      <MediaDetailModal
        item={selectedMedia}
        isAdmin={isAdmin}
        onClose={() => setSelectedMedia(null)}
        onEdit={(item) => {
          setSelectedMedia(null);
          handleOpenEditModal(item);
        }}
        onDelete={(id) => {
          handleDeleteMedia(id);
          setSelectedMedia(null);
        }}
        onTagClick={handleTagClickFromCardOrModal}
        onCreatorClick={handleCreatorClick}
        allItems={items}
        onSimilarClick={(matchedItem) => setSelectedMedia(matchedItem)}
      />

      <CreatorBioModal
        creatorName={selectedCreatorForBio}
        allItems={items}
        onClose={() => setSelectedCreatorForBio(null)}
        onItemClick={(item) => {
          setSelectedCreatorForBio(null);
          setActiveView('archive');
          setSelectedMedia(item);
        }}
        onTagClick={handleTagClickFromCardOrModal}
      />

      <GlobalTagModal
        tagName={selectedTagForBio}
        allItems={items}
        isAdmin={isAdmin}
        onClose={() => setSelectedTagForBio(null)}
        onItemClick={(item) => {
          setSelectedTagForBio(null);
          setActiveView('archive');
          setSelectedMedia(item);
        }}
        onRenameTag={handleRenameTagGlobally}
        onDeleteTag={handleDeleteTagGlobally}
      />

      {isPasscodeModalOpen && (
        <PasscodeModal
          isOpen={isPasscodeModalOpen}
          onClose={() => setIsPasscodeModalOpen(false)}
          onSuccess={(passcode) => {
            setIsAdmin(true);
            setAdminPasscode(passcode);
          }}
        />
      )}

      {isAdminMediaModalOpen && (
        <AdminMediaModal
          isOpen={isAdminMediaModalOpen}
          itemToEdit={itemToEdit}
          allItems={items}
          onClose={() => {
            setIsAdminMediaModalOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleSaveMedia}
          existingPhilosophicalTags={allPhilosophicalTags}
          existingStyleTags={allStyleTags}
        />
      )}

      {isAdminToolsOpen && (
        <AdminToolsDrawer
          isOpen={isAdminToolsOpen}
          onClose={() => setIsAdminToolsOpen(false)}
          onDatabaseUpdate={(updated) => setItems(updated)}
          onLockAdmin={() => setIsAdmin(false)}
        />
      )}
    </div>
  );
}
