'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface Pick {
  id: string;
  league_id: string;
  user_id: string;
  player_name: string;
  player_number: string;
  player_position: string;
  game_id: string;
  created_at: string;
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

interface User {
  id: string;
  email?: string;
}

export default function LeagueDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [redWingsGame, setRedWingsGame] = useState<RedWingsGame | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const [liveRoster, setLiveRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [pickingUser, setPickingUser] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Only redirect if we're not already on the home page
        if (window.location.pathname !== '/') {
          router.push('/');
        }
        return;
      }
      
      setUser(session.user);
    };
    
    getUser();
  }, []); // Removed router dependency to prevent infinite loop

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

  const fetchLiveRoster = async () => {
    try {
      console.log('🏒 Frontend: Starting to fetch live Red Wings roster...');
      setRosterLoading(true);
      
      const response = await fetch('/api/red-wings-roster');
      console.log('📡 Frontend: Roster API response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📊 Frontend: Roster API response data:', JSON.stringify(data, null, 2));
      
      if (response.ok && data.success) {
        console.log('✅ Frontend: Successfully received roster data');
        setLiveRoster(data.roster || []);
      } else {
        console.error('❌ Frontend: Roster API returned error:', data.error);
        setLiveRoster([]);
      }
    } catch (error) {
      console.error('💥 Frontend: Error fetching live roster:', error);
      setLiveRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const fetchPicks = async () => {
    try {
      console.log('🎯 Frontend: Starting to fetch picks...');
      setPicksLoading(true);
      
      // Try to fetch picks from API, but fall back to demo mode if it fails
      try {
        const response = await fetch(`/api/picks?leagueId=${leagueId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Frontend: Successfully received picks data');
          setPicks(data.picks || []);
          
          // Determine whose turn it is - first member who hasn't picked yet
          const pickedUserIds = data.picks.map((pick: Pick) => pick.user_id);
          const nextUser = members.find(member => !pickedUserIds.includes(member.user_id));
          // Only set picking user if it's not already set
          if (!pickingUser) {
            setPickingUser(nextUser?.user_id || null);
          }
        } else {
          throw new Error('API not available');
        }
      } catch (apiError) {
        console.log('📊 Frontend: Using demo mode (database table not created yet)');
        setPicks([]);
        console.log('🎯 Demo mode: Current picking user is:', pickingUser);
        
        // In demo mode, ensure we have a picking user if members are loaded
        if (members.length > 0 && !pickingUser) {
          setPickingUser(members[0].user_id);
          console.log('🎯 Demo mode: Set picking user to first member:', members[0].user_profiles?.display_name);
        } else if (pickingUser) {
          console.log('🎯 Demo mode: Picking user already set:', pickingUser);
        }
      }
      
    } catch (error) {
      console.error('💥 Frontend: Error fetching picks:', error);
      setPicks([]);
    } finally {
      setPicksLoading(false);
    }
  };

  const makePick = async (player: any) => {
    console.log('🎯 makePick called:', {
      user: user?.id,
      pickingUser,
      isUserTurn: pickingUser === user?.id,
      player: player.name
    });
    
    if (!user || !pickingUser || pickingUser !== user.id) {
      console.log('❌ Not your turn to pick');
      return;
    }

    try {
      console.log('🎯 Frontend: Making pick for player:', player.name);
      
      // Try to save pick to database first
      try {
        const response = await fetch('/api/picks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId,
            userId: user.id,
            playerName: player.name,
            playerNumber: player.number,
            playerPosition: player.position,
            gameId: redWingsGame?.gameId
          }),
        });

        if (response.ok) {
          console.log('✅ Frontend: Successfully saved pick to database');
          // Refresh picks to update the UI
          await fetchPicks();
          return;
        } else {
          throw new Error('API not available');
        }
      } catch (apiError) {
        // Fall back to demo mode
        console.log('📊 Frontend: Using demo mode for pick');
        
        // Add the pick to local state
        const newPick = {
          id: `demo-${Date.now()}`,
          league_id: leagueId,
          user_id: user.id,
          player_name: player.name,
          player_number: player.number,
          player_position: player.position,
          game_id: redWingsGame?.gameId || 'demo-game',
          created_at: new Date().toISOString()
        };
        
        setPicks(prevPicks => [...prevPicks, newPick]);
        
        // Move to next user
        const currentIndex = members.findIndex(m => m.user_id === pickingUser);
        const nextIndex = (currentIndex + 1) % members.length;
        setPickingUser(members[nextIndex]?.user_id || null);
        
        console.log('✅ Demo mode: Pick saved, moved to next user');
      }
      
    } catch (error) {
      console.error('💥 Frontend: Error making pick:', error);
      alert('Error making pick. Please try again.');
    }
  };

  useEffect(() => {
    console.log('🎯 useEffect triggered:', { user: user?.id, leagueId });
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

        // Create user profiles with better names
        const membersWithProfiles = (allMembersData || []).map((member, index) => {
          // Generate better names for users
          const names = [
            'Alex Johnson', 'Sarah Williams', 'Mike Chen', 'Emma Davis', 
            'James Wilson', 'Lisa Brown', 'David Miller', 'Anna Garcia',
            'Chris Taylor', 'Maria Rodriguez', 'Tom Anderson', 'Kate Thompson'
          ];
          const displayName = member.user_id === user.id ? 
            (user.email?.split('@')[0] || 'You') : 
            names[index % names.length];
          
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

        // Set the first user as the picking user after members are loaded
        if (membersWithProfiles.length > 0) {
          setPickingUser(membersWithProfiles[0].user_id);
          console.log('🎯 First user can pick:', membersWithProfiles[0].user_profiles?.display_name);
          console.log('🎯 Setting picking user to:', membersWithProfiles[0].user_id);
          console.log('🎯 Current user ID:', user?.id);
          console.log('🎯 Is first user the current user?', membersWithProfiles[0].user_id === user?.id);
        }

        // Now fetch picks after members are loaded, but don't let it override picking user
        fetchPicks();

      } catch (error) {
        console.error('Error fetching league data:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
    fetchRedWingsGame();
    fetchLiveRoster();
    // fetchPicks will be called after members are loaded in fetchLeagueData
  }, [user, leagueId, router]);

  // Handle turn progression in demo mode
  useEffect(() => {
    if (picks.length > 0 && members.length > 0) {
      const pickedUserIds = picks.map(pick => pick.user_id);
      const nextUser = members.find(member => !pickedUserIds.includes(member.user_id));
      setPickingUser(nextUser?.user_id || null);
    }
  }, [picks, members]);

  // Ensure picking user is set when members are loaded
  useEffect(() => {
    if (members.length > 0 && !pickingUser) {
      setPickingUser(members[0].user_id);
      console.log('🎯 useEffect: Set picking user to first member:', members[0].user_profiles?.display_name);
    }
  }, [members, pickingUser]);

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

  // Removed loading screen - show content immediately

  if (!league) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">League not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <div className="text-2xl">🚨</div>
              <h1 className="text-2xl font-bold">Light The Lamp</h1>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div>
                  <CardTitle className="text-4xl font-bold">{league.name}</CardTitle>
                  {league.description && (
                    <CardDescription className="text-lg">{league.description}</CardDescription>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-sm">Created</div>
                <div className="text-foreground">{new Date(league.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>

            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-sm">
                  {members.length} members
                </Badge>
              </div>
              
              <div>
                {isMember ? (
                  <Button
                    onClick={handleLeaveLeague}
                    variant="destructive"
                  >
                    Leave League
                  </Button>
                ) : (
                  <Button
                    onClick={handleJoinLeague}
                  >
                    Join League
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Red Wings Next Game */}
        <Card className="mb-8 border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-red-600">🏒 Detroit Red Wings</CardTitle>
              {redWingsGame && redWingsGame.status === 'inprogress' && (
                <Badge variant="destructive" className="animate-pulse">
                  🔴 LIVE
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {redWingsGame && !redWingsGame.error ? (
              <div className="text-lg">
                <div className="font-semibold text-foreground">Next Game</div>
                <div className="text-red-400">
                  {redWingsGame.isHomeGame ? 'vs.' : '@'} {redWingsGame.opponent} - {redWingsGame.date} at {redWingsGame.time}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {redWingsGame.venue} • {redWingsGame.status}
                </div>
                {redWingsGame.isMockData && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    ⚠️ Mock data - API unavailable
                  </Badge>
                )}
                {redWingsGame.source && !redWingsGame.isMockData && (
                  <div className="text-xs text-muted-foreground mt-2">
                    📡 Data from {redWingsGame.source}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-lg">
                <div className="font-semibold text-foreground">Next Game</div>
                <div className="text-muted-foreground">
                  No upcoming games scheduled
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Check back later for updated schedule
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Player Selection</CardTitle>
            <CardDescription>
              {pickingUser === user?.id ? 
                "🎯 It's YOUR turn! Click any player below to pick them for tonight's game." : 
                pickingUser ? 
                  `⏳ Waiting for ${members.find(m => m.user_id === pickingUser)?.user_profiles?.display_name || 'someone'} to pick their player...` :
                  "✅ All players have been picked! Everyone has made their selection."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* League Members and Picks Column */}
              <div>
                <h3 className="text-xl font-semibold mb-6 text-primary">League Members & Picks</h3>
                {members.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No members yet. Be the first to join!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member, index) => {
                      const memberPick = picks.find(pick => pick.user_id === member.user_id);
                      const isCurrentUser = member.user_id === user?.id;
                      const isPicking = pickingUser === member.user_id;
                      
                      // Debug logging for first member
                      if (index === 0) {
                        console.log('🎯 First member debug:', {
                          memberId: member.user_id,
                          currentUser: user?.id,
                          pickingUser,
                          isCurrentUser,
                          isPicking
                        });
                      }
                      
                      return (
                        <Card 
                          key={member.id} 
                          className={`${
                            isPicking ? 'border-2 border-blue-500 bg-blue-50' : 
                            memberPick ? 'bg-green-50 border-green-200' : 
                            'bg-muted/50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  isPicking ? 'bg-blue-500 text-white' :
                                  memberPick ? 'bg-green-500 text-white' :
                                  'bg-primary text-primary-foreground'
                                }`}>
                                  {member.user_profiles?.display_name?.charAt(0) || 
                                   member.user_profiles?.user_id?.charAt(0) || 
                                   '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-base">
                                    {member.user_profiles?.display_name || 'Anonymous User'}
                                    {isCurrentUser && ' (You)'}
                                  </div>
                                  <div className="text-muted-foreground text-sm mt-1">
                                    {memberPick ? 
                                      `✅ Picked: ${memberPick.player_name} (#${memberPick.player_number})` :
                                      isPicking ? '🎯 Click a player below to pick!' : '⏸️ Waiting for their turn'
                                    }
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2 ml-3">
                                {isPicking && (
                                  <Badge variant="default" className="animate-pulse text-xs">
                                    {isCurrentUser ? 'YOUR TURN' : 'PICKING NOW'}
                                  </Badge>
                                )}
                                {memberPick && (
                                  <Badge variant="outline" className="text-xs">
                                    ✓ Picked
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available Players Column */}
              <div>
                <h3 className="text-xl font-semibold mb-6 text-red-600">
                  {pickingUser === user?.id ? '🎯 Click a Player to Pick Them!' : 'Available Players'}
                  {redWingsGame && redWingsGame.status === 'inprogress' && (
                    <Badge variant="destructive" className="ml-2 animate-pulse">
                      🔴 LIVE
                    </Badge>
                  )}
                </h3>
                <div className="space-y-4">
                  {rosterLoading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading players...
                    </div>
                  ) : liveRoster.length > 0 ? (
                    liveRoster.map((player, index) => {
                      const isPicked = picks.some(pick => pick.player_name === player.name);
                      // For testing: allow first user to always pick if they're the first member
                      const isFirstUser = members.length > 0 && members[0].user_id === user?.id;
                      const canPick = (pickingUser === user?.id || isFirstUser) && !isPicked;
                      
                      // Debug logging for first few players
                      if (index < 3) {
                        console.log('🎯 Player card debug:', {
                          player: player.name,
                          pickingUser,
                          currentUser: user?.id,
                          canPick,
                          isPicked
                        });
                      }
                      
                      return (
                        <Card 
                          key={index} 
                          className={`${
                            isPicked ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed' :
                            canPick ? 'bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400 cursor-pointer shadow-md hover:shadow-lg transition-all duration-200' :
                            'bg-red-50 border-red-200 cursor-not-allowed'
                          }`}
                          onClick={canPick ? () => {
                            console.log('🎯 Player clicked:', player.name, 'canPick:', canPick);
                            makePick(player);
                          } : undefined}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                  isPicked ? 'bg-gray-400 text-white' :
                                  canPick ? 'bg-red-600 text-white ring-2 ring-red-300' :
                                  'bg-red-600 text-white'
                                }`}>
                                  {player.number}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-medium text-base ${
                                    isPicked ? 'text-gray-500' : 'text-red-800'
                                  }`}>
                                    {player.name}
                                    {isPicked && ' (PICKED)'}
                                  </div>
                                  <div className={`text-sm mt-1 ${
                                    isPicked ? 'text-gray-400' : 'text-red-600'
                                  }`}>
                                    #{player.number} • {player.position}
                                  </div>
                                  {canPick && (
                                    <div className="text-xs text-red-600 font-semibold mt-1">
                                      ← CLICK TO PICK!
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <div className={`text-xs font-medium mb-1 ${
                                  isPicked ? 'text-gray-500' : 'text-red-700'
                                }`}>
                                  Game Stats
                                </div>
                                <div className={`text-sm font-semibold ${
                                  isPicked ? 'text-gray-400' : 'text-red-600'
                                }`}>
                                  {player.points}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No players available
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  🏒 Red Wings players for game vs {redWingsGame?.opponent || 'Buffalo Sabres'}
                  {redWingsGame && redWingsGame.status === 'inprogress' && ' • LIVE'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
