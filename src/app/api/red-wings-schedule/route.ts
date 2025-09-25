import { NextResponse } from 'next/server';

// NHL Stats API interfaces
interface NHLGame {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
    detailedState: string;
  };
  teams: {
    away: {
      team: {
        id: number;
        name: string;
        abbreviation: string;
      };
      score?: number;
    };
    home: {
      team: {
        id: number;
        name: string;
        abbreviation: string;
      };
      score?: number;
    };
  };
  venue: {
    name: string;
  };
}

interface NHLResponse {
  dates: Array<{
    date: string;
    games: NHLGame[];
  }>;
}

export async function GET() {
  try {
    // Get today's date and format it for the API
    const today = new Date().toISOString().split('T')[0];
    
    // Get next 30 days of games (free API allows longer range)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const endDateString = endDate.toISOString().split('T')[0];
    
    console.log('🔍 Fetching Red Wings schedule from free NHL Stats API...');
    console.log('📅 Date range:', { today, endDate: endDateString });
    
    // Use free NHL Stats API (no key required)
    const apiUrl = `https://statsapi.web.nhl.com/api/v1/schedule?teamId=17&startDate=${today}&endDate=${endDateString}&expand=schedule.teams,schedule.linescore`;
    
    console.log('🌐 NHL Stats API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NHL Fantasy App)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      console.error('❌ NHL Stats API error:', response.status, response.statusText);
      throw new Error(`NHL Stats API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 NHL Stats API response received');
    
    // Find the next upcoming Red Wings game
    let nextGame = null;
    console.log('🎯 Looking for next Red Wings game...');
    
    for (const dateData of data.dates) {
      for (const game of dateData.games) {
        // Skip completed games
        if (game.status.abstractGameState === 'Final' || 
            game.status.abstractGameState === 'Live') {
          continue;
        }
        
        // Check if this is a Red Wings game (team ID 17)
        const isRedWingsGame = game.teams.home.team.id === 17 || game.teams.away.team.id === 17;
        
        if (isRedWingsGame && !nextGame) {
          nextGame = game;
          console.log('✅ Found next Red Wings game!', {
            opponent: game.teams.home.team.id === 17 ? game.teams.away.team.name : game.teams.home.team.name,
            isHome: game.teams.home.team.id === 17,
            gameDate: game.gameDate,
            venue: game.venue.name
          });
          break;
        }
      }
      if (nextGame) break;
    }
    
    if (!nextGame) {
      console.log('❌ No upcoming Red Wings games found');
      return NextResponse.json({ 
        error: 'No upcoming Red Wings games found',
        message: 'No games scheduled in the next 30 days'
      }, { status: 404 });
    }
    
    // Format the response
    const gameDate = new Date(nextGame.gameDate);
    const opponent = nextGame.teams.home.team.id === 17 
      ? nextGame.teams.away.team.name 
      : nextGame.teams.home.team.name;
    
    const isHomeGame = nextGame.teams.home.team.id === 17;
    const venue = nextGame.venue.name;
    
    const formattedGame = {
      gameId: nextGame.gamePk,
      date: gameDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: gameDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      opponent,
      isHomeGame,
      venue,
      status: nextGame.status.detailedState,
      gameDate: nextGame.gameDate,
      source: 'NHL Stats API (Free)'
    };
    
    console.log('🎉 Final formatted game data:', JSON.stringify(formattedGame, null, 2));
    return NextResponse.json(formattedGame);
    
  } catch (error) {
    console.error('💥 Error fetching Red Wings schedule:', error);
    console.error('📋 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return fallback data if API fails
    // Use realistic mock data for better user experience
    const mockOpponents = [
      'Toronto Maple Leafs',
      'Boston Bruins', 
      'Montreal Canadiens',
      'Tampa Bay Lightning',
      'Florida Panthers',
      'Buffalo Sabres',
      'Ottawa Senators',
      'Chicago Blackhawks',
      'New York Rangers',
      'Pittsburgh Penguins'
    ];
    
    const randomOpponent = mockOpponents[Math.floor(Math.random() * mockOpponents.length)];
    const isHomeGame = Math.random() > 0.5;
    const mockDate = new Date();
    mockDate.setDate(mockDate.getDate() + Math.floor(Math.random() * 7) + 1); // 1-7 days from now
    
    const fallbackGame = {
      gameId: 'fallback',
      date: mockDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: mockDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      opponent: randomOpponent,
      isHomeGame,
      venue: isHomeGame ? 'Little Caesars Arena' : `${randomOpponent} Arena`,
      status: 'Scheduled',
      gameDate: mockDate.toISOString(),
      error: 'Unable to fetch live schedule data - showing mock data',
      isMockData: true
    };
    
    console.log('🔄 Returning fallback data:', JSON.stringify(fallbackGame, null, 2));
    return NextResponse.json(fallbackGame, { status: 200 });
  }
}
