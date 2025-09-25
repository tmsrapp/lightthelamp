'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

interface League {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  pot_amount?: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  favorite_team?: string;
  avatar_url?: string;
  bio?: string;
}

interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  joined_at: string;
  user_profiles: UserProfile;
}

interface RedWingsGame {
  gameId: string;
  date: string;
  time: string;
  opponent: string;
  isHomeGame: boolean;
  venue: string;
  status: string;
  gameDate: string;
  error?: string;
  isMockData?: boolean;
  source?: string;
}

export default function LeagueDashboard() {
  const [user, setUser] = useState<any>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [redWingsGame, setRedWingsGame] = useState<RedWingsGame | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/');
        return;
      }
      
      setUser(session.user);
    };
    
    getUser();
  }, [router]);

  const fetchRedWingsGame = async () => {
    try {
      console.log('🏒 Frontend: Starting to fetch Red Wings game...');
      setGameLoading(true);
      
      const response = await fetch('/api/red-wings-schedule');
      console.log('📡 Frontend: API response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📊 Frontend: API response data:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log('✅ Frontend: Successfully received game data');
        setRedWingsGame(data);
      } else {
        console.error('❌ Frontend: API returned error:', data.error);
        setRedWingsGame(null);
      }
    } catch (error) {
      console.error('💥 Frontend: Error fetching Red Wings game:', error);
      setRedWingsGame(null);
    } finally {
      setGameLoading(false);
      console.log('🏁 Frontend: Finished fetching Red Wings game');
    }
  };

  useEffect(() => {
    if (!user || !leagueId) return;
    
    const fetchLeagueData = async () => {
      try {
        setLoading(true);
        
        // Fetch league details
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', leagueId)
          .single();

        if (leagueError) {
          console.error('Error fetching league:', leagueError);
          router.push('/dashboard');
          return;
        }

        setLeague(leagueData);

        // Fetch league members and check membership in one query
        const { data: allMembersData, error: allMembersError } = await supabase
          .from('league_memberships')
          .select('*')
          .eq('league_id', leagueId)
          .order('joined_at', { ascending: true });

        if (allMembersError) {
          console.error('Error fetching members:', allMembersError);
          router.push('/dashboard');
          return;
        }

        // Check if current user is in the members list
        const isUserMember = allMembersData?.some(member => member.user_id === user.id) || false;
        console.log('League Dashboard Debug:', {
          userId: user.id,
          leagueId,
          allMembers: allMembersData,
          isUserMember
        });
        setIsMember(isUserMember);

        // For now, create mock user profiles until the table is created
        const membersWithProfiles = (allMembersData || []).map(member => {
          // If this is the current user, use their email, otherwise show Anonymous User
          const displayName = member.user_id === user.id ? user.email : 'Anonymous User';
          return {
            ...member,
            user_profiles: {
              id: member.user_id,
              user_id: member.user_id,
              display_name: displayName,
              favorite_team: null,
              avatar_url: null,
              bio: null
            }
          };
        });
        setMembers(membersWithProfiles);

      } catch (error) {
        console.error('Error fetching league data:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
    fetchRedWingsGame();
  }, [user, leagueId, router]);

  const handleJoinLeague = async () => {
    if (!user || !leagueId) return;

    try {
      const response = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          userId: user.id,
        }),
      });

      if (response.ok) {
        setIsMember(true);
        // Refresh members list and update membership status
        const { data: membersData, error } = await supabase
          .from('league_memberships')
          .select('*')
          .eq('league_id', leagueId)
          .order('joined_at', { ascending: true });

        if (!error) {
          // Update membership status
          const isUserMember = membersData?.some(member => member.user_id === user.id) || false;
          setIsMember(isUserMember);
          
          // For now, create mock user profiles until the table is created
          const membersWithProfiles = (membersData || []).map(member => {
            // If this is the current user, use their email, otherwise show Anonymous User
            const displayName = member.user_id === user.id ? user.email : 'Anonymous User';
            return {
              ...member,
              user_profiles: {
                id: member.user_id,
                user_id: member.user_id,
                display_name: displayName,
                favorite_team: null,
                avatar_url: null,
                bio: null
              }
            };
          });
          setMembers(membersWithProfiles);
        }
      } else {
        const errorData = await response.json();
        console.error('Error joining league:', errorData.error);
      }
    } catch (error) {
      console.error('Error joining league:', error);
    }
  };

  const handleLeaveLeague = async () => {
    if (!user || !leagueId) return;

    try {
      const response = await fetch(`/api/leagues/join?leagueId=${leagueId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsMember(false);
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        console.error('Error leaving league:', errorData.error);
      }
    } catch (error) {
      console.error('Error leaving league:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-xl">Loading league...</div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-xl">League not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{league.name}</h1>
                {league.description && (
                  <p className="text-gray-600 text-lg">{league.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-gray-500 text-sm">Created</div>
                <div className="text-gray-900">{new Date(league.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            
            {/* League Pot Display */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 mb-6 text-white shadow-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-green-100 mb-1">LEAGUE POT</div>
                <div className="text-4xl font-bold">
                  ${(league.pot_amount || 0).toLocaleString()}
                </div>
                <div className="text-green-200 text-sm mt-1">
                  {members.length} member{members.length !== 1 ? 's' : ''} • ${Math.round((league.pot_amount || 0) / Math.max(members.length, 1))} per member
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-gray-600">
                <span className="font-semibold">{members.length}</span> members
              </div>
              
              {isMember ? (
                <button
                  onClick={handleLeaveLeague}
                  className="bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-lg border border-red-600 transition duration-200"
                >
                  Leave League
                </button>
              ) : (
                <button
                  onClick={handleJoinLeague}
                  className="bg-white hover:bg-gray-50 text-green-600 px-4 py-2 rounded-lg border border-green-600 transition duration-200"
                >
                  Join League
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Red Wings Next Game */}
        <div className="bg-white border border-red-600 text-red-600 rounded-2xl p-6 shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-2">🏒 Detroit Red Wings</h2>
          {gameLoading ? (
            <div className="text-lg">
              <div className="font-semibold">Next Game</div>
              <div className="text-red-400">Loading game schedule...</div>
            </div>
          ) : redWingsGame && !redWingsGame.error ? (
            <div className="text-lg">
              <div className="font-semibold">Next Game</div>
              <div className="text-red-600">
                {redWingsGame.isHomeGame ? 'vs.' : '@'} {redWingsGame.opponent} - {redWingsGame.date} at {redWingsGame.time}
              </div>
              <div className="text-sm text-red-500 mt-1">
                {redWingsGame.venue} • {redWingsGame.status}
              </div>
              {redWingsGame.isMockData && (
                <div className="text-xs text-red-400 mt-2 italic">
                  ⚠️ Mock data - API unavailable
                </div>
              )}
              {redWingsGame.source && !redWingsGame.isMockData && (
                <div className="text-xs text-red-500 mt-2">
                  📡 Data from {redWingsGame.source}
                </div>
              )}
            </div>
          ) : (
            <div className="text-lg">
              <div className="font-semibold">Next Game</div>
              <div className="text-red-400">
                No upcoming games scheduled
              </div>
              <div className="text-sm text-red-300 mt-1">
                Check back later for updated schedule
              </div>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">League Members</h2>
          
          {members.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              No members yet. Be the first to join!
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.user_profiles?.display_name?.charAt(0) || 
                       member.user_profiles?.user_id?.charAt(0) || 
                       '?'}
                    </div>
                    <div>
                      <div className="text-gray-900 font-medium">
                        {member.user_profiles?.display_name || 'Anonymous User'}
                      </div>
                      <div className="text-gray-500 text-sm">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                      {member.user_profiles?.favorite_team && (
                        <div className="text-blue-600 text-xs">
                          🏒 {member.user_profiles.favorite_team}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
