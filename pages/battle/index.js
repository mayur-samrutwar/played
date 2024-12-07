import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSimulateContract } from 'wagmi';
import { parseEther } from 'viem';
import battleABI from '@/contract/abi/battle.json';
import { decodeEventLog } from 'viem';

export default function CreateBattle() {
  const [stakeAmount, setStakeAmount] = useState('');
  const [friendAddress, setFriendAddress] = useState(''); // Added state for friend's address
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { address } = useAccount();
  
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Add simulation to check if the transaction will succeed
  const { data: simulateData } = useSimulateContract({
    address: process.env.NEXT_PUBLIC_BATTLE_CONTRACT_ADDRESS_BASE,
    abi: battleABI,
    functionName: 'createBattle',
    value: stakeAmount ? parseEther(stakeAmount) : undefined,
    account: address,
  });

  const BATTLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BATTLE_CONTRACT_ADDRESS_BASE;
  
  const handleCreateBattle = async (e) => {
    e.preventDefault();
    
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

    if (!friendAddress) {
      alert('Please enter your friend\'s address');
      return;
    }

    setIsCreating(true);
    try {
      const stakeAmountWei = parseEther(stakeAmount);
      
      // Log the transaction parameters for debugging
      console.log('Transaction Parameters:', {
        address: BATTLE_CONTRACT_ADDRESS,
        value: stakeAmountWei.toString(),
        account: address,
      });

      await writeContract({
        address: BATTLE_CONTRACT_ADDRESS,
        abi: battleABI,
        functionName: 'createBattle',
        value: stakeAmountWei,
        args: [], // Assuming the contract function 'createBattle' takes friendAddress as an argument
      });
      
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

  // Watch for transaction confirmation and log event data
  useEffect(() => {
    if (isConfirmed && receipt) {
      try {
        // Get the first log (BattleCreated event)
        const log = receipt.logs[0];
        
        // Decode the event data
        const decodedLog = decodeEventLog({
          abi: battleABI,
          data: log.data,
          topics: log.topics,
        });

        console.log('Decoded Event:', decodedLog);
        
        // Get battleId from the named arguments
        const battleId = decodedLog.args.battleId;
        console.log('Battle ID:', battleId);

        if (battleId) {
          window.location.href = `/battle/${battleId}`;
        }
      } catch (error) {
        console.error('Error decoding event:', error);
      }
    }
  }, [isConfirmed, receipt]);

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
                  required
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
      </div>
    </div>
  );
}
