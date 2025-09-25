import { NextRequest, NextResponse } from 'next/server';
import { createClientForAPI } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientForAPI(request);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId } = await request.json();

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
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
        user_id: user.id
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
    const supabase = createClientForAPI(request);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Leave the league
    const { error } = await supabase
      .from('league_memberships')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', user.id);

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
