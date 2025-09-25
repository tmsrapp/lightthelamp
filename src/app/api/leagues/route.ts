import { NextRequest, NextResponse } from 'next/server';
import { createClientForAPI } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('API GET: Fetching leagues...');
    const supabase = createClientForAPI(request);
    
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
    // Debug: Log cookies
    const cookieHeader = request.headers.get('cookie');
    console.log('API: Received cookies:', cookieHeader);
    
    const supabase = createClientForAPI(request);
    
    // Get the current user
    console.log('API: Getting user for league creation...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('API: User result:', { user: user?.email, authError });
    
    if (authError) {
      console.error('API: Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error: ' + authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.log('API: No user found');
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'League name is required' }, { status: 400 });
    }

    console.log('API: Creating league for user:', user.email);

    // Create the league
    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id
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
        user_id: user.id
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
