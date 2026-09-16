export interface Filters {
  segment: string;
  tier: string;
  family: string;
  minAmount: number;
  recency: string;
}

export const DEFAULT_FILTERS: Filters = {
  segment: 'all', tier: 'all', family: 'all', minAmount: 0, recency: 'all',
};
