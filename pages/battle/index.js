import { useState } from 'react';
import { motion } from 'framer-motion';

export default function CreateBattle() {
  const [stakeAmount, setStakeAmount] = useState('');
  
  const handleCreateBattle = (e) => {
    e.preventDefault();
    // Contract interaction will be added later
    // For now, just redirect to a dummy battle page
    window.location.href = `/battle/${Date.now()}`;
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
                  step="0.01"
                  required
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.1"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Both players must stake this amount to participate
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
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Create Battle
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
