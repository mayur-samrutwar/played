import Link from 'next/link';
import Image from 'next/image';

export default function Games() {
  const games = [
    {
      id: 1,
      name: 'Fruit Ninja',
      description: 'Slice your way through juicy fruits while avoiding bombs in this classic arcade game. Test your reflexes and aim for the highest score!',
      link: '/games/fruit-ninja',
      imageUrl: '/games/fruit-ninja.png',
      category: 'Arcade'
    },
    {
      id: 2,
      name: 'Dino Run',
      description: 'Jump and dodge obstacles in this endless runner. Help our prehistoric friend survive as long as possible!',
      link: '/games/dino',
      imageUrl: '/games/dino.png',
      category: 'Runner',
      comingSoon: true
    },
    {
      id: 3,
      name: 'Plank Challenge',
      description: 'Test your balance and timing in this addictive platformer. How far can you make it?',
      link: '/games/plank',
      imageUrl: '/games/plank.png',
      category: 'Platform',
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen white py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-3 text-gray-900 text-center">Games</h1>
        <p className="text-gray-600 text-center mb-12 text-lg">Choose your adventure from our collection of games</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <div key={game.id}>
              {game.comingSoon ? (
                <div className="relative group bg-white rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-100">
                  <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">Coming Soon</span>
                  </div>
                  <div className="opacity-75">
                    <div className="relative h-56">
                      <Image
                        src={game.imageUrl}
                        alt={game.name}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 text-sm text-gray-700 rounded-full font-medium shadow-sm">
                          {game.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                        {game.name}
                      </h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {game.description}
                      </p>
                      <div className="mt-6 flex items-center">
                        <button className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm 
                          transition-all duration-300 
                          hover:bg-blue-100 hover:shadow-md 
                          active:bg-blue-200 
                          group-hover:translate-x-1">
                          Play Now
                          <svg 
                            className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href={game.link}>
                  <div className="group bg-white rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-100">
                    <div className="relative h-56">
                      <Image
                        src={game.imageUrl}
                        alt={game.name}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 text-sm text-gray-700 rounded-full font-medium shadow-sm">
                          {game.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                        {game.name}
                      </h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {game.description}
                      </p>
                      <div className="mt-6 flex items-center">
                        <button className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm 
                          transition-all duration-300 
                          hover:bg-blue-100 hover:shadow-md 
                          active:bg-blue-200 
                          group-hover:translate-x-1">
                          Play Now
                          <svg 
                            className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
