import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSimulateContract } from 'wagmi';
import { parseEther } from 'viem';
import battleABI from '@/contract/abi/battle.json';
import { decodeEventLog } from 'viem';

export default function CreateBattle() {
  const [stakeAmount, setStakeAmount] = useState('');
  const [friendAddress, setFriendAddress] = useState('0x0000000000000000000000000000000000000000');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [battleLink, setBattleLink] = useState('');

  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: process.env.NEXT_PUBLIC_BATTLE_CONTRACT_ADDRESS_BASE,
    abi: battleABI,
    functionName: 'createBattle',
    value: stakeAmount ? parseEther(stakeAmount) : undefined,
    args: [],
    account: address,
  });

  const BATTLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BATTLE_CONTRACT_ADDRESS_BASE;
  
  // Add game options
  const gameOptions = [
    { id: '0', name: 'Base Ninja', icon: '🥷' },
    { id: '1', name: 'Save the Cat', icon: '🐱' },
    { id: '2', name: 'Dino Run', icon: '🦖' },
  ];

  const handleCreateBattle = async (e) => {
    e.preventDefault();
    
    console.log('Creating battle with params:', {
      address: BATTLE_CONTRACT_ADDRESS,
      stakeAmount,
      hasAddress: !!address,
    });
    
    if (!BATTLE_CONTRACT_ADDRESS) {
      console.error('Contract address is not defined');
      alert('Configuration error: Contract address is missing');
      return;
    }

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }

    setIsCreating(true);
    try {
      const stakeAmountWei = parseEther(stakeAmount);
      
      console.log('Transaction Parameters:', {
        address: BATTLE_CONTRACT_ADDRESS,
        value: stakeAmountWei.toString(),
        account: address,
      });

      if (simulateError) {
        console.error('Simulation error:', simulateError);
        throw new Error(`Simulation failed: ${simulateError.message}`);
      }

      const tx = await writeContract({
        address: BATTLE_CONTRACT_ADDRESS,
        abi: battleABI,
        functionName: 'createBattle',
        value: stakeAmountWei,
        args: [],
      });

      console.log('Transaction submitted:', tx);
      
    } catch (error) {
      console.error('Error creating battle:', error);
      if (error.message.includes('gas')) {
        alert('Transaction failed: Gas estimation error. Please check your stake amount and try again.');
      } else {
        alert(`Failed to create battle: ${error.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Add debug logs to transaction confirmation effect
  useEffect(() => {
    console.log('Transaction status:', { isConfirming, isConfirmed, hash });
    
    if (isConfirmed && receipt) {
      console.log('Transaction receipt:', receipt);
      try {
        const log = receipt.logs[0];
        
        console.log('Transaction log:', log);
        
        const decodedLog = decodeEventLog({
          abi: battleABI,
          data: log.data,
          topics: log.topics,
        });

        console.log('Decoded Event:', decodedLog);
        
        const battleId = decodedLog.args.battleId;
        console.log('Battle ID:', battleId);

        const battleUrl = `${window.location.origin}/battle/${battleId}`;
        setBattleLink(battleUrl);
        setShowTransactionDialog(true);
      } catch (error) {
        console.error('Error decoding event:', error);
      }
    }
  }, [isConfirmed, receipt, isConfirming, hash]);

  // Validate stake amount on input
  const handleStakeAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0)) {
      setStakeAmount(value);
    }
  };

  // Validate friend's address on input
  const handleFriendAddressChange = (e) => {
    const value = e.target.value;
    setFriendAddress(value);
  };

  // Add an effect to monitor write errors
  useEffect(() => {
    if (writeError) {
      console.error('Write Contract Error:', writeError);
    }
  }, [writeError]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create a Battle</h1>
          <p className="text-lg text-gray-600">
            Challenge others to a fitness battle and compete for the prize pool
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleCreateBattle} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Game
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {gameOptions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGame(game.id)}
                    className={`p-4 rounded-lg border ${
                      selectedGame === game.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } flex flex-col items-center justify-center space-y-2`}
                  >
                    <span className="text-2xl">{game.icon}</span>
                    <span className="text-sm font-medium">{game.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount (ETH)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.000000000000000001" // Allow for very precise ETH amounts
                  min="0"
                  required
                  value={stakeAmount}
                  onChange={handleStakeAmountChange}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.1"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Both players must stake this amount to participate
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitor Address (Optional)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={friendAddress}
                  onChange={handleFriendAddressChange}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter your friend&apos;s Ethereum address to invite them to the battle
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Battle Rules</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <span className="mr-2">🎮</span>
                  Both players will play the same game
                </li>
                <li className="flex items-center">
                  <span className="mr-2">⏱️</span>
                  You have 60 seconds to achieve the highest score
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🏆</span>
                  Winner takes the entire prize pool
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🤝</span>
                  In case of a tie, the stake is split equally
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isCreating || isConfirming || !stakeAmount || !address}
              className={`w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium transition-colors duration-200
                ${isCreating || isConfirming || !stakeAmount || !address  ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              {isCreating || isConfirming ? 'Creating Battle...' : 'Create Battle'}
            </button>
          </form>
        </motion.div>

        {showTransactionDialog && battleLink && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              <div className="text-center mb-6">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Battle Created!</h3>
                <p className="text-gray-600">
                  Your battle has been created successfully. Share this link with your friend to start the game.
                </p>
              </div>

              {/* Battle Link Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Battle Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={battleLink}
                    className="flex-1 p-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(battleLink);
                      alert('Link copied!');
                    }}
                    className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join%20my%20battle!&url=${encodeURIComponent(battleLink)}`, '_blank')}
                  className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Share on Twitter
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join my battle! ${battleLink}`)}`, '_blank')}
                  className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share on WhatsApp
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => window.location.href = battleLink}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  View Battle
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransactionDialog(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
