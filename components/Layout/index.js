import Navbar from '../Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col mx-8 my-4 bg-white">
      <Navbar />
      <main className="mt-4 flex-1 bg-white">
        {children}
      </main>
    </div>
  );
}
