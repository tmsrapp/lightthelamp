import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a client for API routes using service role key
function createAPIClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { leagueId, userId } = await request.json();

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAPIClient();

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking membership:', checkError);
      return NextResponse.json({ error: 'Failed to check membership' }, { status: 500 });
    }

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member of this league' }, { status: 400 });
    }

    // Join the league
    const { data: membership, error } = await supabase
      .from('league_memberships')
      .insert({
        league_id: leagueId,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining league:', error);
      return NextResponse.json({ error: 'Failed to join league' }, { status: 500 });
    }

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Error in POST /api/leagues/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const userId = searchParams.get('userId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAPIClient();

    // Leave the league
    const { error } = await supabase
      .from('league_memberships')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving league:', error);
      return NextResponse.json({ error: 'Failed to leave league' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/leagues/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

