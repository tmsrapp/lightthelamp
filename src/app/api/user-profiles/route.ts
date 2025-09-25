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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAPIClient();
    
    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in GET /api/user-profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, favoriteTeam, avatarUrl, bio } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAPIClient();

    // Upsert user profile (create or update)
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        display_name: displayName,
        favorite_team: favoriteTeam,
        avatar_url: avatarUrl,
        bio: bio
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating user profile:', error);
      return NextResponse.json({ error: 'Failed to save user profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in POST /api/user-profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, displayName, favoriteTeam, avatarUrl, bio } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAPIClient();

    // Update user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        display_name: displayName,
        favorite_team: favoriteTeam,
        avatar_url: avatarUrl,
        bio: bio,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in PUT /api/user-profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
