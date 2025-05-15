export interface Paper {
  source: string;
  title: string;
  authors: string[];
  published?: string;
  summary?: string;
  url?: string;                // optional in case some sources don’t return it
  report_section?: string;
  image_url?: string;          // optional thumbnail or figure (if provided)
}

export interface AcademicResponse {
  papers: Paper[];
  full_report?: string;         // markdown-formatted report content
  summary?: string;             // optional brief summary
  metadata?: Record<string, any>;  // optional metadata for extra info (e.g. timestamps, stats)
}
