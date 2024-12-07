import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function BattlePage() {
  const router = useRouter();
  const { id } = router.query;
  const [hasOpponent, setHasOpponent] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasOpponent(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative py-32">
      {/* Battle Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-12 text-center"
      >
        <span className="text-sm font-medium text-gray-500">BATTLE #{id}</span>
        <div className="mt-2 px-4 py-1 bg-gray-100 rounded-full">
          <span className="text-sm text-gray-600">0.2 ETH Prize Pool</span>
        </div>
      </motion.div>

      {/* Main Battle Content */}
      <div className="max-w-3xl w-full px-8">
        <div className="flex justify-between items-center gap-8">
          {/* Player 1 */}
          <motion.div 
            initial={{ x: -500 }}
            animate={{ x: 0 }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 200,
              delay: 0.2
            }}
            className="text-center space-y-2"
          >
            <div className="relative w-48 h-48">
              <Image
                src="/fightman1.jpg"
                alt="Fighter 1"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 font-mono">0x1234...5678</p>
          </motion.div>

          {/* VS */}
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300,
              delay: 1
            }}
            className="text-[80px] font-black text-gray-200 select-none"
          >
            VS
          </motion.div>

          {/* Player 2 / Waiting */}
          <motion.div 
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 200,
              delay: 0.2
            }}
            className="text-center space-y-2"
          >
            {hasOpponent ? (
              <>
                <div className="relative w-48 h-48">
                  <Image
                    src="/fightman2.jpg"
                    alt="Fighter 2"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-600 font-mono">0x8765...4321</p>
              </>
            ) : (
              <>
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-sm text-gray-400"
                  >
                    Waiting for Opponent
                  </motion.span>
                </div>
                <button className="text-sm text-blue-500 hover:text-blue-600">
                  Share Battle Link
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Start Battle Button */}
      {hasOpponent && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <button
            onClick={() => setIsReady(!isReady)}
            className={`
              px-8 py-3 text-lg font-bold rounded-xl
              transform transition-all duration-200
              hover:scale-105 hover:shadow-lg
              ${isReady 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-500 text-white'
              }
            `}
          >
            {isReady ? 'READY!' : 'START BATTLE'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
