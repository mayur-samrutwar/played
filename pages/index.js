import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

// Dynamically import FruitNinja component with SSR disabled
const FruitNinja = dynamic(() => import('@/components/games/FruitNinja'), {
  ssr: false
});

export default function Home() {
  return (
    <div className="min-h-screen bg-[#836EF9]">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-[1400px] mx-auto px-4 py-8"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <FruitNinja showLeaderboard={true} />
        </div>
      </motion.div>
    </div>
  );
}
