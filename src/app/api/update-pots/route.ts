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
    console.log('💰 Updating league pot amounts...');
    
    const supabase = createAPIClient();

    // Update all leagues with interesting pot amounts
    const { data: leagues, error: updateError } = await supabase
      .from('leagues')
      .update({ 
        pot_amount: Math.floor(Math.random() * 5000) + 1000 // Random amount between $1,000-$6,000
      })
      .select('id, name, pot_amount, league_memberships(count)');

    if (updateError) {
      console.error('❌ Error updating league pots:', updateError);
      return NextResponse.json({ error: 'Failed to update league pots' }, { status: 500 });
    }

    console.log('✅ Updated league pot amounts');

    return NextResponse.json({
      success: true,
      message: 'League pot amounts updated',
      leagues: leagues?.map(league => ({
        name: league.name,
        members: league.league_memberships[0]?.count || 0,
        potAmount: league.pot_amount
      }))
    });

  } catch (error) {
    console.error('💥 Pot update failed:', error);
    return NextResponse.json({ 
      error: 'Pot update failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
