import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Get picks for the league with user information
    const supabase = await createClient();
    const { data: picks, error } = await supabase
      .from('picks')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching picks:', error);
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 });
    }

    return NextResponse.json({ picks: picks || [] });
  } catch (error) {
    console.error('Error in picks GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagueId, userId, playerName, playerNumber, playerPosition, gameId } = body;

    if (!leagueId || !userId || !playerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user is a member of the league
    const supabase = await createClient();
    const { data: membership, error: membershipError } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'User is not a member of this league' }, { status: 403 });
    }

    // Check if user already has a pick in this league
    const { data: existingPick, error: existingError } = await supabase
      .from('picks')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing pick:', existingError);
      return NextResponse.json({ error: 'Failed to check existing pick' }, { status: 500 });
    }

    if (existingPick) {
      return NextResponse.json({ error: 'User already has a pick in this league' }, { status: 400 });
    }

    // Create the pick
    const { data: pick, error: insertError } = await supabase
      .from('picks')
      .insert({
        league_id: leagueId,
        user_id: userId,
        player_name: playerName,
        player_number: playerNumber,
        player_position: playerPosition,
        game_id: gameId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating pick:', insertError);
      return NextResponse.json({ error: 'Failed to create pick' }, { status: 500 });
    }

    return NextResponse.json({ pick });
  } catch (error) {
    console.error('Error in picks POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const userId = searchParams.get('userId');

    if (!leagueId || !userId) {
      return NextResponse.json({ error: 'League ID and User ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('picks')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting pick:', error);
      return NextResponse.json({ error: 'Failed to delete pick' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in picks DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
