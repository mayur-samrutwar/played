import dynamic from 'next/dynamic';

// Dynamically import FruitNinja component with SSR disabled
const FruitNinja = dynamic(() => import('@/components/games/FruitNinja'), {
  ssr: false
});

export default function FruitNinjaPage() {
  return <FruitNinja showLeaderboard={true} />;
}
