import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import battleABI from '@/contract/abi/battle.json';
import dynamic from 'next/dynamic';

// Dynamically import FruitNinja with SSR disabled
const FruitNinja = dynamic(() => import('@/components/games/FruitNinja'), {
  ssr: false
});

export default function BattlePage() {
  const router = useRouter();
  const { id: battleId } = router.query;
  const { address } = useAccount();
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [battleError, setBattleError] = useState(null);

  const BATTLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BATTLE_CONTRACT_ADDRESS_BASE;

  // Contract interactions
  const { writeContract } = useWriteContract();
  const { data: battleData, isError, isLoading } = useReadContract({
    address: BATTLE_CONTRACT_ADDRESS,
    abi: battleABI,
    functionName: 'getBattle',
    args: [battleId],
    enabled: !!battleId,
  });

  useEffect(() => {
    if (battleData) {
      console.log('Battle Info:', {
        id: battleId,
        player1: battleData.player1,
        player2: battleData.player2,
        intendedPlayer2: battleData.intendedPlayer2,
        stakeAmount: battleData.stakeAmount?.toString(),
        hasPlayer1Registered: battleData.hasPlayer1Registered,
        hasPlayer2Registered: battleData.hasPlayer2Registered,
        isComplete: battleData.isComplete,
        player1Score: battleData.player1Score?.toString(),
        player2Score: battleData.player2Score?.toString(),
      });
    }
  }, [battleData, battleId]);

  // Join battle transaction state
  const { data: hash, error: writeError } = useWriteContract();
  const { isLoading: isJoining, isSuccess: hasJoined } = useWaitForTransactionReceipt({
    hash,
  });

  const handleJoinBattle = async () => {
    if (!battleData || !address) return;

    try {
      await writeContract({
        address: BATTLE_CONTRACT_ADDRESS,
        abi: battleABI,
        functionName: 'joinBattle',
        args: [battleId],
        value: battleData.stakeAmount,
      });
    } catch (error) {
      console.error('Error joining battle:', error);
      setBattleError(error.message);
    }
  };

  const handleSubmitScore = async (score) => {
    if (!battleData || !address) return;

    try {
      await writeContract({
        address: BATTLE_CONTRACT_ADDRESS,
        abi: battleABI,
        functionName: 'submitScore',
        args: [battleId, score],
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      setBattleError(error.message);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Battle</h1>
          <p className="text-red-500 mb-4">{isError.message}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-600"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!battleData || battleData.player1 === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Battle Not Found</h1>
          <p className="text-gray-600 mb-4">This battle doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-600"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (battleData.isComplete) {
    const totalPrize = parseFloat(battleData.stakeAmount) * 2 / 1e18;
    const winner = parseInt(battleData.player1Score) > parseInt(battleData.player2Score) 
      ? battleData.player1 
      : parseInt(battleData.player2Score) > parseInt(battleData.player1Score)
      ? battleData.player2
      : null;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center relative py-32">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Battle Complete</h1>
          <div className="mt-2 px-4 py-1 bg-gray-100 rounded-full">
            <span className="text-sm text-gray-600">
              {totalPrize} ETH Prize Pool
            </span>
          </div>
        </motion.div>

        <div className="max-w-3xl w-full px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-3 gap-8 items-center">
              {/* Player 1 */}
              <div className="text-center">
                <div className="w-24 h-24 relative rounded-full overflow-hidden mx-auto mb-4">
                  <Image
                    src="/fightman1.jpg"
                    alt="Fighter 1"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-mono mb-2">{battleData.player1}</p>
                <p className="text-lg font-bold">{battleData.player1Score.toString()} pts</p>
              </div>

              {/* VS and Result */}
              <div className="text-center">
                <div className="text-4xl font-black text-gray-200 mb-4">VS</div>
                {winner ? (
                  <div className="text-green-500 font-bold">
                    Winner: {winner === battleData.player1 ? 'Player 1' : 'Player 2'}
                  </div>
                ) : (
                  <div className="text-blue-500 font-bold">Draw</div>
                )}
              </div>

              {/* Player 2 */}
              <div className="text-center">
                <div className="w-24 h-24 relative rounded-full overflow-hidden mx-auto mb-4">
                  <Image
                    src="/fightman2.jpg"
                    alt="Fighter 2"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-mono mb-2">{battleData.player2}</p>
                <p className="text-lg font-bold">{battleData.player2Score.toString()} pts</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/battles')}
          className="mt-8 text-blue-500 hover:text-blue-600"
        >
          Back to Battles
        </button>
      </div>
    );
  }

  // Check if user is allowed to participate
  const isCreator = address === battleData.player1;
  const isPlayer2 = address === battleData.player2;
  const canJoin = !isCreator && 
                  !battleData.hasPlayer2Registered && 
                  (battleData.intendedPlayer2 === '0x0000000000000000000000000000000000000000' || 
                   address === battleData.intendedPlayer2);

  // Game is ready when both players have registered
  const isGameReady = battleData.hasPlayer1Registered && battleData.hasPlayer2Registered;

  // Render game if started
  if (isGameStarted && isGameReady) {
    return (
      <FruitNinja 
        showLeaderboard={false}
        isBattleMode={true}
        onSubmitScore={handleSubmitScore}
        onClose={() => router.push('/battles')}
      />
    );
  }

  // Render battle lobby
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative py-32">
      {/* Battle Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-12 text-center"
      >
        <span className="text-sm font-medium text-gray-500">BATTLE #{battleId}</span>
        <div className="mt-2 px-4 py-1 bg-gray-100 rounded-full">
          <span className="text-sm text-gray-600">
            {parseFloat(battleData.stakeAmount) * 2 / 1e18} ETH Prize Pool
          </span>
        </div>
      </motion.div>

      {/* Players Section */}
      <div className="max-w-3xl w-full px-8">
        <div className="flex justify-between items-center gap-8">
          {/* Player 1 */}
          <motion.div 
            initial={{ x: -500 }}
            animate={{ x: 0 }}
            className="text-center space-y-2"
          >
            <div className="w-48 h-48 relative rounded-xl overflow-hidden">
              <Image
                src="/fightman1.jpg"
                alt="Fighter 1"
                fill
                className="object-cover"
              />
            </div>
            <p className="text-sm text-gray-600 font-mono">{battleData.player1}</p>
          </motion.div>

          {/* VS */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl font-black text-gray-200"
          >
            VS
          </motion.div>

          {/* Player 2 / Join Battle */}
          <motion.div 
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            className="text-center space-y-2"
          >
            {battleData.hasPlayer2Registered ? (
              <>
                <div className="w-48 h-48 relative rounded-xl overflow-hidden">
                  <Image
                    src="/fightman2.jpg"
                    alt="Fighter 2"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm text-gray-600 font-mono">{battleData.player2}</p>
              </>
            ) : (
              <div className="w-48 h-48 relative rounded-xl overflow-hidden">
                {canJoin ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <button
                      onClick={handleJoinBattle}
                      disabled={isJoining}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isJoining ? 'Joining...' : 'Join Battle'}
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-sm text-gray-500">Waiting for Player</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Start Game Button */}
      {isGameReady && !isGameStarted && (isCreator || isPlayer2) && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setIsGameStarted(true)}
          className="mt-12 px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600"
        >
          Start Game
        </motion.button>
      )}

      {/* Error Message */}
      {battleError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-red-500 text-sm"
        >
          {battleError}
        </motion.div>
      )}
    </div>
  );
}
