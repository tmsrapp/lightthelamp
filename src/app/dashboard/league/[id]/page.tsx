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
              <div>
                <CardTitle className="text-4xl font-bold">{league.name}</CardTitle>
                {league.description && (
                  <CardDescription className="text-lg">{league.description}</CardDescription>
                )}
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-sm">Created</div>
                <div className="text-foreground">{new Date(league.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
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
        <Card className="mb-8 border-red-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-red-600">🏒 Detroit Red Wings</CardTitle>
          </CardHeader>
          <CardContent>
            {redWingsGame && !redWingsGame.error ? (
              <div className="text-lg">
                <div className="font-semibold text-foreground">Next Game</div>
                <div className="text-red-600">
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

        {/* Members Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">League Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No members yet. Be the first to join!
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <Card key={member.id} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {member.user_profiles?.display_name?.charAt(0) || 
                           member.user_profiles?.user_id?.charAt(0) || 
                           '?'}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.user_profiles?.display_name || 'Anonymous User'}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </div>
                          {member.user_profiles?.favorite_team && (
                            <Badge variant="outline" className="text-xs mt-1">
                              🏒 {member.user_profiles.favorite_team}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
