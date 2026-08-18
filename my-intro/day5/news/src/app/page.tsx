import { Suspense } from 'react';
import NewsExplorer from '@/components/NewsExplorer';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <NewsExplorer />
    </Suspense>
  );
}
