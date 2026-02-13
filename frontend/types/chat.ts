export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  artifacts?: Artifact[];
  stdout?: string;
  stderr?: string;
  execution_time_ms?: number;
  llm_provider?: string;
  llm_model?: string;
  intent?: string;
  error?: string;
  formatted_output?: string;
  timestamp: string;
}

export interface Artifact {
  name: string;
  base64: string;
  mime_type: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  session_id: string;
  intent?: string;
  explanation?: string;
  code?: string;
  stdout?: string;
  stderr?: string;
  artifacts?: Artifact[];
  execution_time_ms?: number;
  llm_provider?: string;
  llm_model?: string;
  error?: string;
  formatted_output?: string;
  logs?: string[];
}
