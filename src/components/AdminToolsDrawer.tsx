import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { MediaItem } from '../types';
import {
  X,
  Database,
  RotateCcw,
  Download,
  Upload,
  KeyRound,
  Lock,
  Check,
  AlertTriangle
} from 'lucide-react';

interface AdminToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseUpdate: (items: MediaItem[]) => void;
  onLockAdmin: () => void;
}

export const AdminToolsDrawer: React.FC<AdminToolsDrawerProps> = ({
  isOpen,
  onClose,
  onDatabaseUpdate,
  onLockAdmin
}) => {
  if (!isOpen) return null;

  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the database? All items will be cleared or reset.')) {
      const resetData = storageService.resetDatabase();
      onDatabaseUpdate(resetData);
      await storageService.saveArchiveServer(resetData, storageService.getAdminPasscode());
      alert('Internal database reset and saved to archive.json!');
    }
  };

  const handleExport = () => {
    const jsonStr = storageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medium_archive_backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const imported = storageService.importDatabaseJSON(jsonContent);
        onDatabaseUpdate(imported);
        await storageService.saveArchiveServer(imported, storageService.getAdminPasscode());
        setImportError('');
        alert(`Successfully imported and saved ${imported.length} items to server archive.json!`);
      } catch (err) {
        setImportError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode.trim()) return;
    storageService.setAdminPasscode(newPasscode.trim());
    setPasscodeSuccess(true);
    setTimeout(() => setPasscodeSuccess(false), 3000);
    setNewPasscode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col justify-between text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-slate-100">
                  DATABASE ENGINE MANAGER
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Archive Management Controls
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action 1: Export / Download JSON Backup */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Download size={14} className="text-amber-400" /> Export Archive Backup (JSON)
            </h4>
            <p className="text-xs text-slate-400">
              Download your complete internal media database as a portable JSON backup file.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <Download size={14} /> Export JSON File
            </button>
          </div>

          {/* Action 2: Import JSON File */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Upload size={14} className="text-indigo-400" /> Restore / Import Database JSON
            </h4>
            <p className="text-xs text-slate-400">
              Upload a previously exported database JSON file to restore items.
            </p>

            <label className="w-full py-2 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-800/60 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
              <Upload size={14} /> Select JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {importError && (
              <p className="text-xs text-rose-400 font-mono flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> {importError}
              </p>
            )}
          </div>

          {/* Action 3: Reset Database */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <RotateCcw size={14} /> Restore Default Seed Catalog
            </h4>
            <p className="text-xs text-slate-400">
              Replaces current stored entries with the original 8 curated media items.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-mono font-bold transition"
            >
              Reset Database to Seed
            </button>
          </div>

          {/* Action 4: Change Passcode */}
          <form onSubmit={handleChangePasscode} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <KeyRound size={14} className="text-amber-400" /> Update Secret Admin Passcode
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New secret passcode..."
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition"
              >
                Update
              </button>
            </div>

            {passcodeSuccess && (
              <p className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Check size={14} /> Admin passcode updated successfully!
              </p>
            )}
          </form>
        </div>

        {/* Lock Admin */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={() => {
              onLockAdmin();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Lock size={14} /> Lock & Exit Admin Mode
          </button>
        </div>
      </div>
    </div>
  );
};
