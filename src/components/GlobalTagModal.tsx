import React, { useState, useMemo } from 'react';
import { MediaItem } from '../types';
import { SmartImage } from './SmartImage';
import {
  Tag,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Layers,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface GlobalTagModalProps {
  tagName: string | null;
  isAdmin: boolean;
  allItems: MediaItem[];
  onClose: () => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTag: (tagToDelete: string) => void;
  onItemClick: (item: MediaItem) => void;
}

export const GlobalTagModal: React.FC<GlobalTagModalProps> = ({
  tagName,
  isAdmin,
  allItems,
  onClose,
  onRenameTag,
  onDeleteTag,
  onItemClick
}) => {
  if (!tagName) return null;

  const [newTagName, setNewTagName] = useState(tagName);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Find all items that contain this tag
  const taggedItems = useMemo(() => {
    const q = tagName.toLowerCase().trim();
    return allItems.filter((item) => {
      const philo = item.philosophicalTags?.some((t) => t.toLowerCase().trim() === q);
      const style = item.genreStyleTags?.some((t) => t.toLowerCase().trim() === q);
      const genre = item.genres?.some((g) => g.toLowerCase().trim() === q);
      return philo || style || genre;
    });
  }, [tagName, allItems]);

  const handleRename = () => {
    const trimmed = newTagName.trim();
    if (!trimmed || trimmed === tagName) return;

    onRenameTag(tagName, trimmed);
    setSuccessMsg(`Successfully renamed tag "${tagName}" to "${trimmed}" across ${taggedItems.length} items.`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1800);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove the tag "${tagName}" from all ${taggedItems.length} items?`)) {
      onDeleteTag(tagName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100">
                Tag Bio & Catalog Index
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Tagged on {taggedItems.length} media {taggedItems.length === 1 ? 'entry' : 'entries'} in archive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Tag Title Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-indigo-500/30">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-indigo-950/80 text-indigo-200 border border-indigo-500/40 font-mono text-sm font-bold">
                {tagName}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {taggedItems.length} tagged {taggedItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {isAdmin && (
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                <ShieldCheck size={13} /> Admin Editable
              </span>
            )}
          </div>

          {/* Admin Bulk Edit Box */}
          {isAdmin && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Edit size={14} /> Bulk Tag Editor & Typo Fixer
                </h4>
                <span className="text-[10px] font-mono text-amber-400/80">
                  Global change across database
                </span>
              </div>

              <p className="text-xs font-mono text-slate-300">
                Rename this tag once to update all {taggedItems.length} media items instantly and fix typos across the entire vault.
              </p>

              {successMsg && (
                <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
                  <CheckCircle size={15} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter new tag name..."
                  className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleRename}
                    disabled={!newTagName.trim() || newTagName.trim() === tagName}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Edit size={13} />
                    <span>Rename Globally</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className="px-3.5 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-mono text-xs transition flex items-center gap-1"
                    title="Remove tag from all items"
                  >
                    <Trash2 size={13} />
                    <span>Delete Tag</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List of Tagged Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers size={14} /> Cataloged Items with Tag "{tagName}" ({taggedItems.length})
            </h4>

            {taggedItems.length === 0 ? (
              <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs font-mono text-slate-500">
                No cataloged items are currently tagged with "{tagName}".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {taggedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onItemClick(item);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                      <SmartImage
                        src={item.cover}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold font-mono text-slate-200 group-hover:text-amber-300 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {item.mainCreator} • {item.mediaFormat}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {item.hornetScore}/10
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
