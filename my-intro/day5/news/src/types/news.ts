export type SortOption = 'sim' | 'date';

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  source: string;
  pubDate: string;
}

export interface NewsApiSuccess {
  items: NewsItem[];
  total: number;
  currentPage: number;
}

export type NewsApiErrorCode =
  | 'INVALID_QUERY'
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR';

export interface NewsApiError {
  error: NewsApiErrorCode;
  message: string;
}
