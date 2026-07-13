import React from 'react';

export interface PluginUI {
  id: string;
  order: number;
  name?: string; // Optional: If backend provides a name, we can use it, but UI can override
  icon?: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ settings: any, updateSettings: (newSettings: any) => void }>;
  renderTabAction?: (settings: any, updateSettings: (newSettings: any) => void) => React.ReactNode;
}

export const pluginRegistry: Record<string, PluginUI> = {};

export function registerPlugin(plugin: PluginUI) {
  pluginRegistry[plugin.id] = plugin;
}

// --- Command Palette Extensibility ---

export interface GlobalCommand {
  id: string;
  title: string;
  icon?: React.ReactNode;
  section?: string;   // Grouping (e.g., "Navigation", "System")
  perform: () => void;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  section?: string;
  perform: () => void;
}

export interface SearchProvider {
  id: string;
  search: (query: string) => Promise<SearchResultItem[]>;
}

export const commandRegistry: GlobalCommand[] = [];
export const searchProviders: SearchProvider[] = [];

export function registerCommand(command: GlobalCommand) {
  const existingIdx = commandRegistry.findIndex(c => c.id === command.id);
  if (existingIdx >= 0) {
    commandRegistry[existingIdx] = command;
  } else {
    commandRegistry.push(command);
  }
}

export function registerSearchProvider(provider: SearchProvider) {
  const existingIdx = searchProviders.findIndex(p => p.id === provider.id);
  if (existingIdx >= 0) {
    searchProviders[existingIdx] = provider;
  } else {
    searchProviders.push(provider);
  }
}
