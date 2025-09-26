import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createAPIClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  try {
    console.log('🌱 Starting user seeding...');
    
    const supabase = createAPIClient();

    // Sample users to seed
    const usersToSeed = [
      {
        user_id: 'seed-user-1',
        email: 'alex.johnson@example.com',
        display_name: 'Alex Johnson',
        favorite_team: 'Detroit Red Wings'
      },
      {
        user_id: 'seed-user-2', 
        email: 'sarah.williams@example.com',
        display_name: 'Sarah Williams',
        favorite_team: 'Toronto Maple Leafs'
      },
      {
        user_id: 'seed-user-3',
        email: 'mike.brown@example.com', 
        display_name: 'Mike Brown',
        favorite_team: 'Boston Bruins'
      },
      {
        user_id: 'seed-user-4',
        email: 'emma.davis@example.com',
        display_name: 'Emma Davis',
        favorite_team: 'Chicago Blackhawks'
      },
      {
        user_id: 'seed-user-5',
        email: 'chris.miller@example.com',
        display_name: 'Chris Miller', 
        favorite_team: 'Pittsburgh Penguins'
      },
      {
        user_id: 'seed-user-6',
        email: 'jessica.garcia@example.com',
        display_name: 'Jessica Garcia',
        favorite_team: 'New York Rangers'
      }
    ];

    // Get existing leagues
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name')
      .limit(2);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
    }

    if (!leagues || leagues.length === 0) {
      return NextResponse.json({ error: 'No leagues found' }, { status: 404 });
    }

    console.log('📊 Found leagues:', leagues.map(l => l.name));

    // Insert user profiles
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .upsert(usersToSeed, { onConflict: 'user_id' })
      .select();

    if (profilesError) {
      console.error('❌ Error seeding user profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to seed user profiles' }, { status: 500 });
    }

    console.log('✅ Seeded', userProfiles.length, 'user profiles');

    // Add users to leagues
    const leagueMemberships = [];
    
    // Add first 3 users to first league
    for (let i = 0; i < 3; i++) {
      leagueMemberships.push({
        league_id: leagues[0].id,
        user_id: usersToSeed[i].user_id,
        joined_at: new Date().toISOString()
      });
    }
    
    // Add last 3 users to second league (if it exists)
    if (leagues[1]) {
      for (let i = 3; i < 6; i++) {
        leagueMemberships.push({
          league_id: leagues[1].id, 
          user_id: usersToSeed[i].user_id,
          joined_at: new Date().toISOString()
        });
      }
    } else {
      // If only one league, add all users to it
      for (let i = 3; i < 6; i++) {
        leagueMemberships.push({
          league_id: leagues[0].id, 
          user_id: usersToSeed[i].user_id,
          joined_at: new Date().toISOString()
        });
      }
    }

    // Insert league memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('league_memberships')
      .upsert(leagueMemberships, { onConflict: 'league_id,user_id' })
      .select();

    if (membershipsError) {
      console.error('❌ Error seeding league memberships:', membershipsError);
      return NextResponse.json({ error: 'Failed to seed league memberships' }, { status: 500 });
    }

    console.log('✅ Added', memberships.length, 'league memberships');

    // Update league pot amounts
    const { error: potError } = await supabase
      .from('leagues')
      .update({ pot_amount: 1500 })
      .in('id', leagues.map(l => l.id));

    if (potError) {
      console.error('❌ Error updating league pots:', potError);
      return NextResponse.json({ error: 'Failed to update league pots' }, { status: 500 });
    }

    console.log('✅ Updated league pot amounts to $1,500');

    // Get final league stats
    const { data: finalLeagues } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        pot_amount,
        league_memberships(count)
      `)
      .in('id', leagues.map(l => l.id));

    console.log('🎉 Seeding completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Seeding completed successfully',
      stats: {
        usersSeeded: userProfiles.length,
        membershipsCreated: memberships.length,
        leaguesUpdated: finalLeagues?.length || 0
      },
      leagues: finalLeagues?.map(league => ({
        name: league.name,
        members: league.league_memberships[0].count,
        potAmount: league.pot_amount
      }))
    });

  } catch (error) {
    console.error('💥 Seeding failed:', error);
    return NextResponse.json({ 
      error: 'Seeding failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
