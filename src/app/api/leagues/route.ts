import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a client for API routes using service role key
function createAPIClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    console.log('API GET: Fetching leagues...');
    const supabase = createAPIClient();
    
    // Get leagues with member count
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select(`
        *,
        league_memberships(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leagues:', error);
      return NextResponse.json({ error: 'Failed to fetch leagues: ' + error.message }, { status: 500 });
    }

    console.log('API GET: Successfully fetched', leagues?.length || 0, 'leagues');
    return NextResponse.json({ leagues });
  } catch (error) {
    console.error('Error in GET /api/leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, userId } = await request.json();
    
    console.log('API: Creating league for user:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'League name is required' }, { status: 400 });
    }

    const supabase = createAPIClient();

    // Create the league with default pot amount
    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: userId,
        pot_amount: 0 // Default pot amount
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating league:', error);
      return NextResponse.json({ error: 'Failed to create league: ' + error.message }, { status: 500 });
    }

    // Automatically add the creator as a member
    const { error: membershipError } = await supabase
      .from('league_memberships')
      .insert({
        league_id: league.id,
        user_id: userId
      });

    if (membershipError) {
      console.error('Error adding creator to league:', membershipError);
      // Don't fail the request, just log the error
    }

    console.log('API: League created successfully:', league.id);
    return NextResponse.json({ league });
  } catch (error) {
    console.error('Error in POST /api/leagues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
