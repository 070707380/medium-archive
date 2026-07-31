import React from 'react';
import { MediaItem } from '../types';
import { HornetBadge } from './HornetBadge';
import { Calendar, User, Film, BookOpen, Gamepad2, Tv, Bookmark, Disc, Palette, Image as ImageIcon, FileText, Globe } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { extractReleaseYear } from '../utils/dateUtils';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  onCreatorClick?: (creatorName: string) => void;
}

export const MediaCardComponent: React.FC<MediaCardProps> = ({ item, onClick, onTagClick, onCreatorClick }) => {
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Film':
        return <Film size={12} />;
      case 'Video Game':
        return <Gamepad2 size={12} />;
      case 'Music Album':
        return <Disc size={12} />;
      case 'Painting':
        return <Palette size={12} />;
      case 'Artwork':
        return <ImageIcon size={12} />;
      case 'TV Show':
        return <Tv size={12} />;
      case 'Comic/Manga Series':
        return <FileText size={12} />;
      case 'Book':
        return <BookOpen size={12} />;
      default:
        return <Bookmark size={12} />;
    }
  };

  const parsedYear = extractReleaseYear(item.releaseDate);
  const releaseYear = parsedYear ? String(parsedYear) : (item.releaseDate ? item.releaseDate.substring(0, 4) : 'N/A');

  return (
    <div
      onClick={() => onClick(item)}
      className="group relative w-full min-w-0 bg-[#0f1218] hover:bg-[#131720] border border-slate-800/90 hover:border-amber-500/50 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 flex flex-col cursor-pointer transform hover:-translate-y-0.5"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <SmartImage
          src={item.cover}
          alt={item.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1218] via-transparent to-black/40" />

        {/* Format Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-md border border-slate-700/70 text-slate-200 text-[11px] font-mono font-medium shadow-sm">
          <span className="text-amber-400">{getFormatIcon(item.mediaFormat)}</span>
          <span>{item.mediaFormat}</span>
        </div>

        {/* Hornet Score Badge */}
        <div className="absolute top-2.5 right-2.5">
          <HornetBadge score={item.hornetScore} size="sm" />
        </div>

        {/* Bottom Badges: Release Year, Origin & Consumed Version */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-300 text-[10px] font-mono bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.2 rounded border border-slate-800">
              <Calendar size={10} className="text-slate-400" />
              <span>{releaseYear}</span>
            </div>

            {item.countryOfOrigin && (
              <div className="flex items-center gap-1 text-amber-200 text-[10px] font-mono bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.2 rounded border border-slate-800">
                <Globe size={10} className="text-amber-400" />
                <span>{item.countryOfOrigin}</span>
              </div>
            )}
          </div>

          {item.consumedVersion && (
            <div className="text-purple-300 text-[10px] font-mono bg-purple-950/90 backdrop-blur-sm px-1.5 py-0.2 rounded border border-purple-800/60 font-semibold shrink-0">
              <span>{item.consumedVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5 min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1 font-mono tracking-tight">
            {item.title}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 line-clamp-1 font-mono">
            <User size={11} className="text-slate-500 shrink-0" />
            <span
              onClick={(e) => {
                if (onCreatorClick) {
                  e.stopPropagation();
                  onCreatorClick(item.mainCreator);
                }
              }}
              className="hover:text-amber-400 hover:underline cursor-pointer truncate"
            >
              {item.mainCreator}
            </span>
          </div>
        </div>

        {/* Genres & Tags */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          {/* Primary: Main Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genres.slice(0, 2).map((genre, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold truncate max-w-[140px]"
                >
                  {genre}
                </span>
              ))}
              {item.genres.length > 2 && (
                <span className="text-[10px] font-mono text-slate-500 self-center">
                  +{item.genres.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Secondary: Style & Philosophical Tags */}
          <div className="flex flex-wrap gap-1">
            {item.genreStyleTags && item.genreStyleTags.slice(0, 1).map((tag, idx) => (
              <span
                key={`style-${idx}`}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800 truncate max-w-[120px]"
              >
                {tag}
              </span>
            ))}
            {item.philosophicalTags && item.philosophicalTags.slice(0, 1).map((tag, idx) => (
              <button
                key={`phil-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/50 transition truncate max-w-[120px]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MediaCard = React.memo(MediaCardComponent);

