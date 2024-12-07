import Image from 'next/image'

export default function Challenges() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Challenge
        </button>
      </div>

      {/* Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reward Challenge Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-3 py-1 bg-blue-700 rounded-full text-sm">Reward Challenge</span>
              <h2 className="text-2xl font-bold mt-3">Base Ninja Master</h2>
            </div>
            <Image 
              src="/Base_Network_Logo.svg"
              alt="Challenge Icon"
              width={40}
              height={40}
            />
          </div>
          <p className="mb-6">Score more than 1000 points in Base Ninja game and claim your free Base name!</p>
          
          <div className="flex justify-between items-center">
            {/* Avatar Group */}
            <div className="flex -space-x-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-500 overflow-hidden bg-white">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} 
                    alt="participant"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-blue-700 border-2 border-blue-500 flex items-center justify-center text-xs">
                +99
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Stake: 0 ETH</span>
              <a href="#" className="px-4 py-2 bg-white text-blue-700 rounded-full text-sm hover:text-blue-800 transition">
                Participate
              </a>
            </div>
          </div>
        </div>

        {/* Daily Challenge Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-3 py-1 bg-green-700 rounded-full text-sm">Daily Challenge</span>
              <h2 className="text-2xl font-bold mt-3">Daily Ninja Tournament</h2>
            </div>
            <Image 
              src="/Base_Network_Logo.svg"
              alt="Challenge Icon"
              width={40}
              height={40}
            />
          </div>
          <p className="mb-6">Compete in today&apos;s Base Ninja tournament! Top 3 players share 0.001 ETH prize pool.</p>
          
          <div className="flex justify-between items-center">
            {/* Avatar Group */}
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-green-500 overflow-hidden bg-white">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} 
                    alt="participant"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-green-700 border-2 border-green-500 flex items-center justify-center text-xs">
                +12
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Prize: 0.001 ETH</span>
              <a href="#" className="px-4 py-2 bg-green-700 rounded-full text-sm hover:bg-green-800 transition">
                Join Today
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
