import React from 'react';
import { TransformerPanel } from '../components/TransformerPanel';
import { DeduplicatorPanel } from '../components/DeduplicatorPanel';
import { ArchiveBrowser } from '../components/ArchiveBrowser';
import LiveChatPanel from '../components/LiveChatPanel';
import ManualEditorPanel from '../components/ManualEditorPanel';

// Export them to avoid unused import TS errors if we ever need them dynamically
export const pluginComponents: Record<string, React.ComponentType<any>> = {
  'prompt-transformer': TransformerPanel,
  'context-deduplicator': DeduplicatorPanel,
  'archive': ArchiveBrowser,
  'live-chat-plugin': LiveChatPanel,
  'manual-editor': ManualEditorPanel
};
// Keep other plugin components here if they exist
