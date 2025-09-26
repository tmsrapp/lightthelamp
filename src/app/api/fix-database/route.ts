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
    console.log('🔧 Fixing database schema...');
    
    const supabase = createAPIClient();

    // Check if pot_amount column exists by trying to select it
    const { data: testQuery, error: testError } = await supabase
      .from('leagues')
      .select('id, name, pot_amount')
      .limit(1);

    if (testError && testError.code === 'PGRST204') {
      console.log('⚠️  pot_amount column missing, attempting to add it...');
      
      // Try to add the column using SQL
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE leagues ADD COLUMN IF NOT EXISTS pot_amount INTEGER DEFAULT 0;'
      });

      if (alterError) {
        console.error('❌ Could not add pot_amount column:', alterError);
        return NextResponse.json({ 
          error: 'Could not add pot_amount column',
          details: alterError.message 
        }, { status: 500 });
      }

      console.log('✅ Added pot_amount column');
    } else if (testError) {
      console.error('❌ Error testing pot_amount column:', testError);
      return NextResponse.json({ 
        error: 'Database access error',
        details: testError.message 
      }, { status: 500 });
    } else {
      console.log('✅ pot_amount column already exists');
    }

    // Update existing leagues to have pot amounts
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ pot_amount: Math.floor(Math.random() * 3000) + 500 })
      .is('pot_amount', null);

    if (updateError) {
      console.log('⚠️  Could not update pot amounts:', updateError.message);
    } else {
      console.log('✅ Updated league pot amounts');
    }

    // Test the leagues query
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        pot_amount,
        league_memberships(count)
      `);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return NextResponse.json({ 
        error: 'Could not fetch leagues',
        details: leaguesError.message 
      }, { status: 500 });
    }

    console.log('🎉 Database fix completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Database schema fixed',
      leagues: leagues?.map(league => ({
        name: league.name,
        members: league.league_memberships[0]?.count || 0,
        potAmount: league.pot_amount || 0
      }))
    });

  } catch (error) {
    console.error('💥 Database fix failed:', error);
    return NextResponse.json({ 
      error: 'Database fix failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
