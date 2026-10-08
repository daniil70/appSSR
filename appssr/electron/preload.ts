import { contextBridge, ipcRenderer } from 'electron';
import type { AppSSRApi, InstallEvent } from '../shared/types';

const invoke = <T>(channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: AppSSRApi = {
  platform: process.platform,
  auth: {
    login: (login, password) => invoke('auth:login', login, password),
    register: (login, password, displayName) => invoke('auth:register', login, password, displayName),
    logout: () => invoke('auth:logout'),
    current: () => invoke('auth:current'),
  },
  catalog: {
    get: () => invoke('catalog:get'),
    saveProgram: (program) => invoke('catalog:saveProgram', program),
    deleteProgram: (id) => invoke('catalog:deleteProgram', id),
    saveTable: (table) => invoke('catalog:saveTable', table),
    deleteTable: (id) => invoke('catalog:deleteTable', id),
    saveSection: (section) => invoke('catalog:saveSection', section),
    deleteSection: (id) => invoke('catalog:deleteSection', id),
    saveSettings: (settings) => invoke('catalog:saveSettings', settings),
    audit: () => invoke('catalog:audit'),
  },
  programs: {
    statuses: () => invoke('programs:statuses'),
    install: (id) => invoke('programs:install', id),
    open: (id) => invoke('programs:open', id),
    remove: (id) => invoke('programs:remove', id),
    onInstallEvent: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, event: InstallEvent) => cb(event);
      ipcRenderer.on('programs:event', listener);
      return () => ipcRenderer.removeListener('programs:event', listener);
    },
  },
  users: {
    list: () => invoke('users:list'),
    setPermissions: (id, permissions) => invoke('users:setPermissions', id, permissions),
    setRole: (id, role) => invoke('users:setRole', id, role),
  },
  system: {
    openExternal: (url) => invoke('system:openExternal', url),
    chooseFolder: () => invoke('system:chooseFolder'),
    favorites: () => invoke('system:favorites'),
    setFavorites: (ids) => invoke('system:setFavorites', ids),
  },
};

contextBridge.exposeInMainWorld('appssr', api);
