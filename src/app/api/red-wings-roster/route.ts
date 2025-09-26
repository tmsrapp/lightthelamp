import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Fetching Red Wings roster from NHL Web API...');
    
    // Get yesterday's date to get the most recent completed game
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // NHL Web API - no API key required!
    const apiUrl = `https://api-web.nhle.com/v1/score/${yesterdayStr}`;
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
      throw new Error(`NHL API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 NHL API response received');
    
    // Find the Red Wings game from yesterday
    let redWingsGame: any = null;
    
    for (const game of data.games) {
      // Check if Detroit Red Wings is playing (team ID: 17)
      const isRedWingsGame = game.awayTeam?.id === 17 || game.homeTeam?.id === 17;
      
      if (isRedWingsGame) {
        redWingsGame = game;
        console.log('✅ Found Red Wings game!', {
          opponent: game.awayTeam?.id === 17 ? game.homeTeam?.name?.default : game.awayTeam?.name?.default,
          isHome: game.homeTeam?.id === 17,
          gameDate: game.startTimeUTC,
          status: game.gameState,
          score: `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`
        });
        break;
      }
    }
    
    if (!redWingsGame) {
      console.log('❌ No Red Wings game found for yesterday, using fallback roster');
      throw new Error('No Red Wings game found for yesterday');
    }
    
    // Extract players who scored/assisted from the goals data
    const goals = redWingsGame.goals || [];
    const redWingsGoals = goals.filter((goal: any) => goal.teamAbbrev === 'DET');
    
    console.log('🎯 Found', redWingsGoals.length, 'Red Wings goals');
    
    // Process the goals data to extract player stats
    const playerStats: { [key: string]: any } = {};
    
    // Process goals
    for (const goal of redWingsGoals) {
      const playerId = goal.playerId;
      const playerName = goal.name.default;
      
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          name: playerName,
          playerId: playerId,
          goals: 0,
          assists: 0,
          points: 0,
          mugshot: goal.mugshot,
          goalsToDate: goal.goalsToDate || 0
        };
      }
      
      playerStats[playerId].goals += 1;
      playerStats[playerId].points += 1;
    }
    
    // Process assists
    for (const goal of redWingsGoals) {
      if (goal.assists) {
        for (const assist of goal.assists) {
          const playerId = assist.playerId;
          const playerName = assist.name.default;
          
          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              name: playerName,
              playerId: playerId,
              goals: 0,
              assists: 0,
              points: 0,
              mugshot: null,
              goalsToDate: 0
            };
          }
          
          playerStats[playerId].assists += 1;
          playerStats[playerId].points += 1;
        }
      }
    }
    
    // Convert to array and sort by points
    const roster = Object.values(playerStats)
      .map((player: any) => ({
        name: player.name,
        number: player.playerId, // Using player ID as number for now
        position: 'F', // Default position
        points: `${player.goals}G, ${player.assists}A`,
        stats: {
          goals: player.goals,
          assists: player.assists,
          points: player.points,
          shots: 0,
          hits: 0,
          blocks: 0
        }
      }))
      .sort((a: any, b: any) => b.stats.points - a.stats.points);
    
    console.log('🎉 Roster compiled:', roster.length, 'players who scored/assisted');
    
    return NextResponse.json({
      success: true,
      roster: roster,
      gameId: redWingsGame.id,
      source: 'NHL Web API (Free) - Last Game Data',
      isLive: false,
      opponent: redWingsGame.awayTeam?.id === 17 ? redWingsGame.homeTeam?.name?.default : redWingsGame.awayTeam?.name?.default,
      gameStatus: redWingsGame.gameState,
      game: {
        score: `${redWingsGame.awayTeam?.score || 0}-${redWingsGame.homeTeam?.score || 0}`,
        venue: redWingsGame.venue?.default,
        gameDate: redWingsGame.startTimeUTC
      }
    });
    
  } catch (error) {
    console.error('💥 Error fetching Red Wings roster:', error);
    
    // Return fallback roster data
    const fallbackRoster = [
      { name: 'Dylan Larkin', number: 71, position: 'C', points: '1G, 1A', stats: { goals: 1, assists: 1, points: 2, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Lucas Raymond', number: 23, position: 'RW', points: '0G, 2A', stats: { goals: 0, assists: 2, points: 2, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Alex DeBrincat', number: 93, position: 'LW', points: '2G, 0A', stats: { goals: 2, assists: 0, points: 2, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Moritz Seider', number: 53, position: 'D', points: '0G, 1A', stats: { goals: 0, assists: 1, points: 1, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Jake Walman', number: 96, position: 'D', points: '0G, 0A', stats: { goals: 0, assists: 0, points: 0, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Alex Lyon', number: 34, position: 'G', points: '24/26', stats: { goals: 0, assists: 0, points: 0, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Andrew Copp', number: 18, position: 'C', points: '1G, 0A', stats: { goals: 1, assists: 0, points: 1, shots: 0, hits: 0, blocks: 0 } },
      { name: 'J.T. Compher', number: 37, position: 'C', points: '0G, 1A', stats: { goals: 0, assists: 1, points: 1, shots: 0, hits: 0, blocks: 0 } },
      { name: 'David Perron', number: 57, position: 'LW', points: '0G, 1A', stats: { goals: 0, assists: 1, points: 1, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Ben Chiarot', number: 8, position: 'D', points: '0G, 0A', stats: { goals: 0, assists: 0, points: 0, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Olli Määttä', number: 2, position: 'D', points: '0G, 0A', stats: { goals: 0, assists: 0, points: 0, shots: 0, hits: 0, blocks: 0 } },
      { name: 'Michael Rasmussen', number: 27, position: 'C', points: '0G, 0A', stats: { goals: 0, assists: 0, points: 0, shots: 0, hits: 0, blocks: 0 } }
    ];
    
    return NextResponse.json({
      success: true,
      roster: fallbackRoster,
      source: 'Fallback data - API error',
      isLive: false,
      opponent: 'Buffalo Sabres',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
