import { NextResponse } from 'next/server';

// Sportradar NHL API interfaces
interface SportradarGame {
  id: string;
  scheduled: string;
  status: string;
  home: {
    id: string;
    name: string;
    alias: string;
  };
  away: {
    id: string;
    name: string;
    alias: string;
  };
  venue: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
}

interface SportradarResponse {
  games: SportradarGame[];
}

export async function GET() {
  try {
    console.log('🔍 Fetching Red Wings schedule from Sportradar NHL API...');
    
    // Get today's date and format it for Sportradar API (YYYY/MM/DD format)
    const today = new Date();
    
    // Try multiple dates to find upcoming games
    const datesToTry = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      datesToTry.push(dateStr);
    }
    
    console.log('📅 Checking dates:', datesToTry);
    
    // Sportradar NHL API key from environment variables
    const apiKey = process.env.SPORTRADAR_NHL_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SPORTRADAR_NHL_API_KEY environment variable not found');
      throw new Error('API key not configured');
    }
    
    // Try each date until we find a Red Wings game
    for (const dateStr of datesToTry) {
      const apiUrl = `https://api.sportradar.com/nhl/trial/v7/en/games/${dateStr}/schedule.json?api_key=${apiKey}`;
      console.log('🌐 Trying Sportradar URL for date:', dateStr);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LightTheLamp/1.0'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.log(`❌ Sportradar API error for ${dateStr}:`, response.status, response.statusText);
          const responseText = await response.text();
          console.log('Response text:', responseText.substring(0, 200));
          continue; // Try next date
        }
        
        const data: SportradarResponse = await response.json();
        console.log('📊 Sportradar API response received for', dateStr);
        
        if (!data.games || data.games.length === 0) {
          console.log('📅 No games found for', dateStr);
          continue; // Try next date
        }
        
        // Find Red Wings game (Detroit Red Wings)
        let redWingsGame = null;
        for (const game of data.games) {
          // Check if Detroit Red Wings is playing (home or away)
          const isRedWingsGame = game.home.name.toLowerCase().includes('detroit') || 
                                game.away.name.toLowerCase().includes('detroit');
          
          if (isRedWingsGame) {
            redWingsGame = game;
            console.log('✅ Found Red Wings game!', {
              opponent: game.home.name.toLowerCase().includes('detroit') ? game.away.name : game.home.name,
              isHome: game.home.name.toLowerCase().includes('detroit'),
              scheduled: game.scheduled,
              venue: game.venue.name
            });
            break;
          }
        }
        
        if (redWingsGame) {
          // Format the response
          const gameDate = new Date(redWingsGame.scheduled);
          const opponent = redWingsGame.home.name.toLowerCase().includes('detroit') 
            ? redWingsGame.away.name 
            : redWingsGame.home.name;
          
          const isHomeGame = redWingsGame.home.name.toLowerCase().includes('detroit');
          const venue = redWingsGame.venue.name;
          
          const formattedGame = {
            gameId: redWingsGame.id,
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
            status: redWingsGame.status,
            gameDate: redWingsGame.scheduled,
            source: 'Sportradar NHL API'
          };
          
          console.log('🎉 Final formatted game data:', JSON.stringify(formattedGame, null, 2));
          return NextResponse.json(formattedGame);
        }
        
      } catch (fetchError) {
        console.log(`💥 Fetch error for ${dateStr}:`, fetchError);
        continue; // Try next date
      }
    }
    
    console.log('❌ No upcoming Red Wings games found in next 14 days');
    throw new Error('No upcoming Red Wings games found');
    
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
