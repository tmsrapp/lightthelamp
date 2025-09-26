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
    console.log('🌱 Adding memberships to leagues...');
    
    const supabase = createAPIClient();

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

    // Create some additional memberships with mock user IDs
    const membershipsToAdd = [
      // Add to first league
      {
        league_id: leagues[0].id,
        user_id: 'mock-user-alex',
        joined_at: new Date().toISOString()
      },
      {
        league_id: leagues[0].id,
        user_id: 'mock-user-sarah', 
        joined_at: new Date().toISOString()
      },
      {
        league_id: leagues[0].id,
        user_id: 'mock-user-mike',
        joined_at: new Date().toISOString()
      },
      // Add to second league (if it exists)
      ...(leagues[1] ? [
        {
          league_id: leagues[1].id,
          user_id: 'mock-user-emma',
          joined_at: new Date().toISOString()
        },
        {
          league_id: leagues[1].id,
          user_id: 'mock-user-chris',
          joined_at: new Date().toISOString()
        },
        {
          league_id: leagues[1].id,
          user_id: 'mock-user-jessica',
          joined_at: new Date().toISOString()
        }
      ] : [
        // If only one league, add them to the first league too
        {
          league_id: leagues[0].id,
          user_id: 'mock-user-emma',
          joined_at: new Date().toISOString()
        },
        {
          league_id: leagues[0].id,
          user_id: 'mock-user-chris',
          joined_at: new Date().toISOString()
        },
        {
          league_id: leagues[0].id,
          user_id: 'mock-user-jessica',
          joined_at: new Date().toISOString()
        }
      ])
    ];

    // Insert league memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('league_memberships')
      .upsert(membershipsToAdd, { onConflict: 'league_id,user_id' })
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
      message: 'Memberships added successfully',
      stats: {
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
