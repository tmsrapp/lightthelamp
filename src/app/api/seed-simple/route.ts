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
    console.log('🌱 Simple seeding - adding memberships...');
    
    const supabase = createAPIClient();

    // Get existing leagues
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name');

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
    }

    console.log('📊 Found leagues:', leagues?.map(l => l.name));

    // Try to insert memberships one by one
    const results = [];
    
    for (const league of leagues || []) {
      console.log(`Adding members to ${league.name}...`);
      
      // Add 3 members to each league
      const membersToAdd = [
        { user_id: `seed-${league.id}-1` },
        { user_id: `seed-${league.id}-2` },
        { user_id: `seed-${league.id}-3` }
      ];

      for (const member of membersToAdd) {
        try {
          const { data, error } = await supabase
            .from('league_memberships')
            .insert({
              league_id: league.id,
              user_id: member.user_id,
              joined_at: new Date().toISOString()
            })
            .select();

          if (error) {
            console.log(`⚠️  Could not add ${member.user_id} to ${league.name}:`, error.message);
          } else {
            console.log(`✅ Added ${member.user_id} to ${league.name}`);
            results.push({ league: league.name, user: member.user_id });
          }
        } catch (err) {
          console.log(`⚠️  Error adding ${member.user_id}:`, err);
        }
      }
    }

    // Update league pot amounts
    const { error: potError } = await supabase
      .from('leagues')
      .update({ pot_amount: 1500 })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all leagues

    if (potError) {
      console.error('❌ Error updating league pots:', potError);
    } else {
      console.log('✅ Updated league pot amounts');
    }

    // Get final stats
    const { data: finalLeagues } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        pot_amount,
        league_memberships(count)
      `);

    return NextResponse.json({
      success: true,
      message: 'Simple seeding completed',
      addedMemberships: results.length,
      leagues: finalLeagues?.map(league => ({
        name: league.name,
        members: league.league_memberships[0]?.count || 0,
        potAmount: league.pot_amount
      }))
    });

  } catch (error) {
    console.error('💥 Simple seeding failed:', error);
    return NextResponse.json({ 
      error: 'Simple seeding failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
