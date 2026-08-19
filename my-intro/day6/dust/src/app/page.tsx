import { Suspense } from 'react';
import DustExplorer from '@/components/DustExplorer';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <DustExplorer />
    </Suspense>
  );
}
