export interface MessageOptions {
  timeout?: number;
  retryUnavailable?: boolean;
}

export type SupportedTab = chrome.tabs.Tab & { id: number };
