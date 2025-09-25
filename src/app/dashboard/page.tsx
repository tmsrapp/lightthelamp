'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface League {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  league_memberships: { count: number }[];
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [creatingLeague, setCreatingLeague] = useState(false);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      console.log('Dashboard: Getting user...');
      
      // First try to refresh the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Dashboard: Session check:', { session: session?.user?.email, sessionError });
      
      if (session?.user) {
        console.log('Dashboard: User found in session');
        setUser(session.user);
        setLoading(false);
        return;
      }
      
      // If no session, try to get user directly
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Dashboard: User result:', { user: user?.email, error });
      
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        console.log('Dashboard: No user, redirecting to home');
        router.push('/');
      }
    };

    getUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchLeagues();
      fetchUserMemberships();
    }
  }, [user]);

  const fetchLeagues = async () => {
    try {
      setLeaguesLoading(true);
      const response = await fetch('/api/leagues');
      const data = await response.json();
      if (response.ok) {
        setLeagues(data.leagues);
      } else {
        console.error('Error fetching leagues:', data.error);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLeaguesLoading(false);
    }
  };

  const fetchUserMemberships = async () => {
    if (!user) return;
    
    try {
      const { data: memberships, error } = await supabase
        .from('league_memberships')
        .select('league_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      const membershipSet = new Set(memberships.map(m => m.league_id));
      setUserMemberships(membershipSet);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;

    try {
      setCreatingLeague(true);
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLeagueName,
          description: newLeagueDescription,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setNewLeagueName('');
        setNewLeagueDescription('');
        setShowCreateForm(false);
        fetchLeagues();
        fetchUserMemberships();
      } else {
        alert(data.error || 'Failed to create league');
      }
    } catch (error) {
      console.error('Error creating league:', error);
      alert('Failed to create league');
    } finally {
      setCreatingLeague(false);
    }
  };

  const handleJoinLeague = async (leagueId: string) => {
    try {
      const response = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leagueId, userId: user.id }),
      });

      const data = await response.json();
      if (response.ok) {
        fetchLeagues();
        fetchUserMemberships();
      } else {
        alert(data.error || 'Failed to join league');
      }
    } catch (error) {
      console.error('Error joining league:', error);
      alert('Failed to join league');
    }
  };

  const handleLeaveLeague = async (leagueId: string) => {
    try {
      const response = await fetch(`/api/leagues/join?leagueId=${leagueId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        fetchLeagues();
        fetchUserMemberships();
      } else {
        alert(data.error || 'Failed to leave league');
      }
    } catch (error) {
      console.error('Error leaving league:', error);
      alert('Failed to leave league');
    }
  };

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <div className="text-xl font-bold text-white">🏒</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Light The Lamp</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.email}</span>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Fantasy Leagues</h2>
            <p className="text-gray-600 text-lg">Join existing leagues or create your own</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200 font-semibold"
          >
            {showCreateForm ? 'Cancel' : '+ Create League'}
          </button>
        </div>

        {/* Create League Form */}
        {showCreateForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New League</h3>
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label htmlFor="leagueName" className="block text-sm font-medium text-gray-700 mb-2">
                  League Name *
                </label>
                <input
                  type="text"
                  id="leagueName"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter league name"
                  required
                />
              </div>
              <div>
                <label htmlFor="leagueDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="leagueDescription"
                  value={newLeagueDescription}
                  onChange={(e) => setNewLeagueDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter league description"
                  rows={3}
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={creatingLeague || !newLeagueName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition duration-200 font-semibold"
                >
                  {creatingLeague ? 'Creating...' : 'Create League'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leagues List */}
        <div className="space-y-6">
          {leaguesLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-900 text-xl">Loading leagues...</div>
            </div>
          ) : leagues.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">🏒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No leagues yet</h3>
              <p className="text-gray-600">Be the first to create a league!</p>
            </div>
          ) : (
            leagues.map((league) => {
              const memberCount = league.league_memberships[0]?.count || 0;
              const isMember = userMemberships.has(league.id);
              const isCreator = league.created_by === user?.id;

              return (
                <div key={league.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:bg-gray-100 transition duration-200 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/dashboard/league/${league.id}`)}
                    >
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition duration-200">{league.name}</h3>
                      {league.description && (
                        <p className="text-gray-600 mb-3">{league.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                        <span>📅 Created {new Date(league.created_at).toLocaleDateString()}</span>
                        {isCreator && <span className="text-yellow-600">👑 You created this league</span>}
                      </div>
                      {isMember && (
                        <div className="mt-2 text-sm text-green-600">
                          ✓ You're a member - Click to view league
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col space-y-2">
                      {isMember ? (
                        <>
                          <button
                            onClick={() => router.push(`/dashboard/league/${league.id}`)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200 font-semibold"
                          >
                            View League
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveLeague(league.id);
                            }}
                            disabled={isCreator}
                            className={`px-4 py-2 rounded-lg transition duration-200 font-semibold ${
                              isCreator
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {isCreator ? 'Creator' : 'Leave'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinLeague(league.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 font-semibold"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
