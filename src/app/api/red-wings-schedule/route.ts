import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Fetching Red Wings schedule from NHL Web API...');
    
    // Get today's date and format it for NHL API (YYYY-MM-DD format)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get next 14 days
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('📅 Checking dates from', todayStr, 'to', endDateStr);
    
    // NHL Web API - no API key required!
    const apiUrl = `https://api-web.nhle.com/v1/schedule/${todayStr}`;
    console.log('🌐 NHL API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LightTheLamp/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ NHL API error:`, response.status, response.statusText);
      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200));
      throw new Error(`NHL API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 NHL API response received');
    
    // Find the next Red Wings game
    let redWingsGame: any = null;
    
    // Look through the gameWeek array for Red Wings games
    for (const dateData of data.gameWeek) {
      if (dateData.games) {
        for (const game of dateData.games) {
          // Check if Detroit Red Wings is playing (team ID: 17)
          const isRedWingsGame = game.awayTeam?.id === 17 || game.homeTeam?.id === 17;
          
          if (isRedWingsGame) {
            redWingsGame = game;
            console.log('✅ Found Red Wings game!', {
              opponent: game.awayTeam?.id === 17 ? game.homeTeam?.commonName?.default : game.awayTeam?.commonName?.default,
              isHome: game.homeTeam?.id === 17,
              gameDate: game.startTimeUTC,
              status: game.gameState
            });
            break;
          }
        }
        if (redWingsGame) break;
      }
    }
    
    if (!redWingsGame) {
      console.log('❌ No upcoming Red Wings games found in next 14 days');
      throw new Error('No upcoming Red Wings games found');
    }
    
    // Format the response
    const gameDate = new Date(redWingsGame.startTimeUTC);
    const opponent = redWingsGame.awayTeam?.id === 17 
      ? redWingsGame.homeTeam?.commonName?.default 
      : redWingsGame.awayTeam?.commonName?.default;
    
    const isHomeGame = redWingsGame.homeTeam?.id === 17;
    const venue = redWingsGame.venue?.default;
    
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
      status: redWingsGame.gameState,
      gameDate: redWingsGame.startTimeUTC,
      homeScore: 0,
      awayScore: 0,
      source: 'NHL Web API (Free)'
    };
    
    console.log('🎉 Final formatted game data:', JSON.stringify(formattedGame, null, 2));
    return NextResponse.json(formattedGame);
    
  } catch (error) {
    console.error('💥 Error fetching Red Wings schedule:', error);
    
    // Return fallback data if API fails
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
    mockDate.setDate(mockDate.getDate() + Math.floor(Math.random() * 7) + 1);
    
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
      homeScore: 0,
      awayScore: 0,
      error: 'Unable to fetch live schedule data - showing mock data',
      isMockData: true,
      source: 'Fallback data'
    };
    
    console.log('🔄 Returning fallback data:', JSON.stringify(fallbackGame, null, 2));
    return NextResponse.json(fallbackGame, { status: 200 });
  }
}
