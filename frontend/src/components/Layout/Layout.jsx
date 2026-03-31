import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-5 max-w-2xl w-full">
        <Outlet />
      </main>
    </div>
  );
}
