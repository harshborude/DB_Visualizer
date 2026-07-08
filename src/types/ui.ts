export type ActiveTab = 'overview' | 'columns' | 'keys' | 'relationships' | 'health' | 'impact' | 'docs';

export const TABS: { id: ActiveTab, label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'columns', label: 'Columns' },
  { id: 'keys', label: 'Keys' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'health', label: 'Health' },
  { id: 'impact', label: 'Impact' },
  { id: 'docs', label: 'Documentation' }
];
