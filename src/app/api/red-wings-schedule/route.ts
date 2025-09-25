import { NextResponse } from 'next/server';

interface GameData {
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
    games: GameData[];
  }>;
}

export async function GET() {
  try {
    // Get today's date and format it for the API
    const today = new Date().toISOString().split('T')[0];
    
    // Get next 7 days of games
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateString = endDate.toISOString().split('T')[0];
    
    // Fetch Red Wings schedule from NHL Stats API
    const response = await fetch(
      `https://statsapi.web.nhl.com/api/v1/schedule?teamId=17&startDate=${today}&endDate=${endDateString}&expand=schedule.teams,schedule.linescore`
    );
    
    if (!response.ok) {
      throw new Error(`NHL API responded with status: ${response.status}`);
    }
    
    const data: NHLResponse = await response.json();
    
    // Find the next upcoming game
    let nextGame = null;
    
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
          nextGame = {
            ...game,
            date: dateData.date
          };
          break;
        }
      }
      if (nextGame) break;
    }
    
    if (!nextGame) {
      return NextResponse.json({ 
        error: 'No upcoming Red Wings games found',
        message: 'No games scheduled in the next 7 days'
      }, { status: 404 });
    }
    
    // Format the response
    const gameDate = new Date(nextGame.gameDate);
    const opponent = nextGame.teams.home.team.id === 17 
      ? nextGame.teams.away.team.name 
      : nextGame.teams.home.team.name;
    
    const isHomeGame = nextGame.teams.home.team.id === 17;
    const venue = isHomeGame ? nextGame.venue.name : `${opponent} Arena`;
    
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
      gameDate: nextGame.gameDate
    };
    
    return NextResponse.json(formattedGame);
    
  } catch (error) {
    console.error('Error fetching Red Wings schedule:', error);
    
    // Return fallback data if API fails
    const fallbackGame = {
      gameId: 'fallback',
      date: 'TBD',
      time: 'TBD',
      opponent: 'TBD',
      isHomeGame: true,
      venue: 'Little Caesars Arena',
      status: 'TBD',
      gameDate: new Date().toISOString(),
      error: 'Unable to fetch live schedule data'
    };
    
    return NextResponse.json(fallbackGame, { status: 200 });
  }
}
