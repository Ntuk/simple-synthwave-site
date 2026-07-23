export interface TripBlock {
  type: 'text' | 'image';
  text?: string;      // for text blocks
  url?: string;       // for image blocks (public URL)
  filename?: string;  // for image blocks (stored name)
}

export interface Trip {
  id: number;
  slug: string;
  title: string;
  location: string;
  month: number; // 1-12
  year: number;
  cover: string | null; // cover image url
  blocks: TripBlock[];
  createdAt: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const formatMonthYear = (month: number, year: number): string => {
  const name = MONTHS[month - 1] ?? '';
  return name ? `${name} ${year}` : `${year}`;
};
