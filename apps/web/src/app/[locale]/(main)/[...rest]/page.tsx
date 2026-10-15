import { notFound } from 'next/navigation';

// Catch-all so unknown URLs render the localized not-found page inside the locale layout.
export default function CatchAllPage() {
  notFound();
}
