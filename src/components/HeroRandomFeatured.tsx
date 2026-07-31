import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { Dices, Layers } from 'lucide-react';

interface HeroRandomFeaturedProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
}

export const HeroRandomFeatured: React.FC<HeroRandomFeaturedProps> = ({
  items,
  onItemClick,
  onTagClick
}) => {
  const [randomized, setRandomized] = useState<MediaItem[]>([]);

  const shuffleItems = () => {
    if (!items.length) return;
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    setRandomized(shuffled.slice(0, 3));
  };

  useEffect(() => {
    shuffleItems();
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="mb-6 bg-gradient-to-r from-[#0c0e14] via-[#10141d] to-[#0d0e14] border border-slate-800/90 rounded-xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Background glow highlights */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10 border-b border-slate-800/80 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold tracking-wider uppercase mb-1">
            <Dices size={11} />
            <span>SERENDIPITY DECK</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold font-mono text-slate-100 tracking-tight flex items-center gap-2">
            Random Catalog Sample Deck
          </h2>
        </div>

        <button
          onClick={shuffleItems}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow transition shrink-0"
        >
          <Dices size={14} />
          <span>Shuffle Deck</span>
        </button>
      </div>

      {/* Grid of randomized cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {randomized.map((item) => (
          <MediaCard
            key={`random-${item.id}`}
            item={item}
            onClick={onItemClick}
            onTagClick={onTagClick}
          />
        ))}
      </div>
    </section>
  );
};

