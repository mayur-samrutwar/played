import Link from 'next/link';
import Image from 'next/image';

export default function Games() {
  const games = [
    {
      id: 1,
      name: 'Fruit Ninja',
      description: 'Slice your way through juicy fruits while avoiding bombs in this classic arcade game. Test your reflexes and aim for the highest score!',
      link: '/games/fruit-ninja',
      imageUrl: '/images/fruit-ninja-poster.jpg'
    },
    {
      id: 2,
      name: 'Save the Cats',
      description: 'Help rescue adorable cats from tricky situations in this puzzle adventure. Use your problem-solving skills to ensure every kitty gets home safely!',
      link: '/games/save-the-cats',
      imageUrl: '/images/save-cats-poster.jpg'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Games Gallery</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link href={game.link} key={game.id}>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-48">
                <Image
                  src={game.imageUrl}
                  alt={game.name}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{game.name}</h2>
                <p className="text-gray-600">{game.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
