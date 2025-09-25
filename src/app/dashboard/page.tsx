'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center mr-3">
                <div className="text-xl font-bold text-blue-900">🏒</div>
              </div>
              <h1 className="text-2xl font-bold text-white">Light The Lamp</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/80">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to Your Dashboard</h2>
          <p className="text-blue-200 text-lg">Ready to start your NHL fantasy journey?</p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">Join a League</h3>
            <p className="text-blue-200">Find or create leagues for your favorite NHL team</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Pick Players</h3>
            <p className="text-blue-200">Select players before each game and earn points</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-white mb-2">Snake Draft</h3>
            <p className="text-blue-200">Fair player selection with rotating draft order</p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Coming Soon</h3>
            <p className="text-blue-200 text-lg">
              We're building the ultimate NHL fantasy experience. Stay tuned for league creation, 
              player selection, and live scoring updates!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
