import { useEffect, useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getContract } from 'viem';
import GamesABI from '../contract/abi/games.json';

const GAMES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAMES_CONTRACT_ADDRESS_BASE;
const FRUIT_NINJA_GAME_ID = 0;
const BLOCK_RANGE = 50000n; // Maximum block range allowed

export function useGamesContract() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Submit score function
  const submitScore = async (score) => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    setIsSubmitting(true);
    try {
      const contract = getContract({
        address: GAMES_CONTRACT_ADDRESS,
        abi: GamesABI,
        walletClient,
      });

      // Call the contract method
      const hash = await contract.write.submitScore([FRUIT_NINJA_GAME_ID, BigInt(score)]);
      
      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      return true;
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch historical scores on mount
  useEffect(() => {
    const fetchHistoricalScores = async () => {
      if (!publicClient) return;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        let fromBlock = 0n;
        let allLogs = [];

        // Fetch logs in chunks
        while (fromBlock <= currentBlock) {
          const toBlock = fromBlock + BLOCK_RANGE > currentBlock 
            ? currentBlock 
            : fromBlock + BLOCK_RANGE;

          const logs = await publicClient.getLogs({
            address: GAMES_CONTRACT_ADDRESS,
            event: {
              type: 'event',
              name: 'ScoreSubmitted',
              inputs: [
                { type: 'uint256', name: 'gameId', indexed: true },
                { type: 'address', name: 'player', indexed: true },
                { type: 'uint256', name: 'score', indexed: false },
                { type: 'uint256', name: 'timestamp', indexed: false }
              ]
            },
            fromBlock: fromBlock,
            toBlock: toBlock
          });

          allLogs = [...allLogs, ...logs];
          fromBlock = toBlock + 1n;

          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Transform and sort events
        const scores = allLogs
          .filter(log => log.args.gameId === FRUIT_NINJA_GAME_ID)
          .map(log => ({
            player: log.args.player,
            score: log.args.score.toString(),
            timestamp: log.args.timestamp.toString()
          }));
        
        // Sort by score (descending)
        const sortedScores = scores.sort((a, b) => Number(b.score) - Number(a.score));
        setLeaderboardData(sortedScores);
      } catch (error) {
        console.error('Error fetching historical scores:', error);
      }
    };

    fetchHistoricalScores();
  }, [publicClient]);

  // Watch for new score submissions
  useEffect(() => {
    if (!publicClient) return;

    const unwatch = publicClient.watchEvent({
      address: GAMES_CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'ScoreSubmitted',
        inputs: [
          { type: 'uint256', name: 'gameId', indexed: true },
          { type: 'address', name: 'player', indexed: true },
          { type: 'uint256', name: 'score', indexed: false },
          { type: 'uint256', name: 'timestamp', indexed: false }
        ]
      },
      onLogs: (logs) => {
        const newScores = logs
          .filter(log => log.args.gameId === FRUIT_NINJA_GAME_ID)
          .map(log => ({
            player: log.args.player,
            score: log.args.score.toString(),
            timestamp: log.args.timestamp.toString()
          }));

        setLeaderboardData(prev => {
          const combined = [...prev, ...newScores];
          return combined.sort((a, b) => Number(b.score) - Number(a.score));
        });
      }
    });

    return () => {
      unwatch();
    };
  }, [publicClient]);

  return {
    submitScore,
    isSubmitting,
    leaderboardData
  };
}