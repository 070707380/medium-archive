import { MediaItem } from '../types';
import { INITIAL_MEDIA_ITEMS } from '../data/initialData';

const STORAGE_KEY = 'medium_archive_items_v2';
const PASSCODE_KEY = 'medium_archive_admin_passcode_v1';

export const storageService = {
  /**
   * Fetch archive items from the archive.json endpoint or fallback to localStorage / initialData
   */
  async fetchMediaItems(): Promise<MediaItem[]> {
    try {
      const response = await fetch('/archive.json', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.saveAllMediaItems(data);
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not fetch /archive.json, falling back to cached storage:', err);
    }
    const localItems = this.getMediaItems();
    if (localItems.length > 0) {
      // Sync local cached items back to archive.json if server file was empty
      this.saveArchiveServer(localItems, this.getAdminPasscode()).catch(() => {});
    }
    return localItems;
  },

  getMediaItems(): MediaItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveAllMediaItems(INITIAL_MEDIA_ITEMS);
        return INITIAL_MEDIA_ITEMS;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_MEDIA_ITEMS;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return INITIAL_MEDIA_ITEMS;
    }
  },

  saveAllMediaItems(items: MediaItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  /**
   * Saves full archive items array directly to archive.json database file on server
   */
  async saveArchiveServer(items: MediaItem[], passcode: string): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    try {
      const res = await fetch('/api/save-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode || this.getAdminPasscode(), items }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save database to server archive.json');
      }

      const updatedArchive = data.archive || items;
      this.saveAllMediaItems(updatedArchive);

      return {
        success: true,
        items: updatedArchive,
        message: data.message || 'Database archive.json permanently updated on server!',
      };
    } catch (err: any) {
      console.error('saveArchiveServer error:', err);
      this.saveAllMediaItems(items);
      return {
        success: false,
        items,
        message: err.message || 'Server error, saved locally instead.',
      };
    }
  },

  /**
   * Submits a new or updated item to serverless API `/api/save-archive` or `/api/add-item`
   */
  async addItemServer(item: MediaItem, passcode: string): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    const currentItems = this.getMediaItems();
    const existingIdx = currentItems.findIndex((i) => i.id === item.id);
    let updated: MediaItem[];

    const processedItem = {
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updated = [...currentItems];
      updated[existingIdx] = processedItem;
    } else {
      updated = [processedItem, ...currentItems];
    }

    return this.saveArchiveServer(updated, passcode);
  },

  async deleteMediaItemServer(id: string, passcode: string): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    const currentItems = this.getMediaItems();
    const updated = currentItems.filter((i) => i.id !== id);
    return this.saveArchiveServer(updated, passcode);
  },

  saveMediaItemLocal(item: MediaItem, passcode?: string): MediaItem[] {
    const items = this.getMediaItems();
    const index = items.findIndex((i) => i.id === item.id);
    let updated: MediaItem[];

    if (index >= 0) {
      updated = [...items];
      updated[index] = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...item,
          id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...items,
      ];
    }

    this.saveAllMediaItems(updated);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer(updated, code).catch((err) =>
        console.warn('Auto saveArchiveServer sync failed:', err)
      );
    }
    return updated;
  },

  deleteMediaItem(id: string, passcode?: string): MediaItem[] {
    const items = this.getMediaItems();
    const updated = items.filter((i) => i.id !== id);
    this.saveAllMediaItems(updated);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer(updated, code).catch((err) =>
        console.warn('Auto saveArchiveServer delete sync failed:', err)
      );
    }
    return updated;
  },

  clearDatabase(passcode?: string): MediaItem[] {
    this.saveAllMediaItems([]);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer([], code).catch((err) =>
        console.warn('Auto saveArchiveServer clear sync failed:', err)
      );
    }
    return [];
  },

  resetDatabase(passcode?: string): MediaItem[] {
    this.saveAllMediaItems([]);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer([], code).catch((err) =>
        console.warn('Auto saveArchiveServer reset sync failed:', err)
      );
    }
    return [];
  },

  exportDatabaseJSON(): string {
    const items = this.getMediaItems();
    return JSON.stringify(items, null, 2);
  },

  importDatabaseJSON(jsonStr: string, passcode?: string): MediaItem[] {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        this.saveAllMediaItems(parsed);
        const code = passcode || this.getAdminPasscode();
        if (code) {
          this.saveArchiveServer(parsed, code).catch((err) =>
            console.warn('Auto saveArchiveServer import sync failed:', err)
          );
        }
        return parsed;
      } else {
        throw new Error('Imported JSON is not an array of media items.');
      }
    } catch (err) {
      throw new Error('Invalid JSON format: ' + (err as Error).message);
    }
  },

  getAdminPasscode(): string {
    return localStorage.getItem(PASSCODE_KEY) || '';
  },

  setAdminPasscode(passcode: string): void {
    localStorage.setItem(PASSCODE_KEY, passcode);
  },

  verifyPasscode(attempt: string): boolean {
    const current = this.getAdminPasscode();
    if (!current) return false;
    return attempt.trim() === current.trim();
  },

  /**
   * Verifies the passcode against the Vercel/Express backend serverless API `/api/verify-passcode`
   * which checks process.env.ADMIN_PASSWORD on Vercel
   */
  async verifyPasscodeServer(attempt: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: attempt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.setAdminPasscode(attempt);
          return true;
        }
      }
    } catch (err) {
      console.warn('Backend passcode verification failed:', err);
    }
    return false;
  },
};
