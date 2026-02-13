import { create } from 'zustand';
import { ChatMessage, ChatResponse } from '../types/chat';
import * as api from '../lib/api';

interface ChatStore {
  messages: ChatMessage[];
  sessionId: string | null;
  loading: boolean;
  logs: string[];
  sendMessage: (universeId: string, message: string) => Promise<void>;
  clearChat: () => void;
  addLog: (log: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  sessionId: null,
  loading: false,
  logs: [],

  sendMessage: async (universeId: string, message: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({ messages: [...s.messages, userMsg], loading: true, logs: [] }));

    try {
      const response: ChatResponse = await api.sendChatMessage(universeId, {
        message,
        session_id: get().sessionId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.explanation || response.error || '',
        code: response.code,
        artifacts: response.artifacts,
        stdout: response.stdout,
        stderr: response.stderr,
        execution_time_ms: response.execution_time_ms,
        llm_provider: response.llm_provider,
        llm_model: response.llm_model,
        intent: response.intent,
        error: response.error,
        formatted_output: response.formatted_output,
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        sessionId: response.session_id,
        loading: false,
        logs: response.logs || [],
      }));
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        error: e.message,
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, errorMsg], loading: false }));
    }
  },

  clearChat: () => set({ messages: [], sessionId: null, logs: [] }),
  addLog: (log: string) => set((s) => ({ logs: [...s.logs, log] })),
}));
