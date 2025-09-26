'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface League {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  league_memberships: { count: number }[];
}

interface User {
  id: string;
  email?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
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
  }, []); // Removed router dependency to prevent infinite loop

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
    if (!newLeagueName.trim() || !user) return;

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
    if (!user) return;
    
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
    if (!user) return;
    
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

  // Handle redirect when user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      // Only redirect if we're not already on the home page
      if (window.location.pathname !== '/') {
        router.push('/');
      }
    }
  }, [loading, user, router]);

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🚨</div>
              <h1 className="text-2xl font-bold">Light The Lamp</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">Welcome, {user.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Leagues</h2>
            <p className="text-muted-foreground text-lg">Join existing leagues or create your own</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant={showCreateForm ? "outline" : "default"}
          >
            {showCreateForm ? 'Cancel' : '+ Create League'}
          </Button>
        </div>

        {/* Create League Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New League</CardTitle>
              <CardDescription>Set up a new league for you and your friends to join</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLeague} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leagueName">League Name *</Label>
                  <Input
                    type="text"
                    id="leagueName"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="Enter league name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leagueDescription">Description (Optional)</Label>
                  <Textarea
                    id="leagueDescription"
                    value={newLeagueDescription}
                    onChange={(e) => setNewLeagueDescription(e.target.value)}
                    placeholder="Enter league description"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={creatingLeague || !newLeagueName.trim()}
                  >
                    {creatingLeague ? 'Creating...' : 'Create League'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Leagues List */}
        <div className="space-y-6">
          {leagues.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-4xl mb-4">🚨</div>
                <h3 className="text-xl font-semibold mb-2">No leagues yet</h3>
                <p className="text-muted-foreground">Be the first to create a league!</p>
              </CardContent>
            </Card>
          ) : (
            leagues.map((league) => {
              const memberCount = league.league_memberships[0]?.count || 0;
              const isMember = userMemberships.has(league.id);
              const isCreator = league.created_by === user?.id;

              return (
                <Card key={league.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/dashboard/league/${league.id}`)}
                      >
                        <h3 className="text-xl font-semibold mb-2 hover:text-primary transition duration-200">{league.name}</h3>
                        {league.description && (
                          <p className="text-muted-foreground mb-3">{league.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                          <span>📅 Created {new Date(league.created_at).toLocaleDateString()}</span>
                          {isCreator && <span className="text-primary">👑 You created this league</span>}
                        </div>
                        {isMember && (
                          <div className="mt-2 text-sm text-red-400">
                            ✓ You&apos;re a member - Click to view league
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col space-y-2">
                        {isMember ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveLeague(league.id);
                            }}
                            disabled={isCreator}
                            variant={isCreator ? "secondary" : "destructive"}
                          >
                            {isCreator ? 'Creator' : 'Leave'}
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinLeague(league.id);
                            }}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
