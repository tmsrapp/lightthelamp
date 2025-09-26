-- Create picks table for storing player selections
CREATE TABLE IF NOT EXISTS picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_number TEXT,
  player_position TEXT,
  game_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id) -- Each user can only have one pick per league
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_picks_league_id ON picks(league_id);
CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks(user_id);

-- Enable RLS
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view picks in leagues they belong to" ON picks
  FOR SELECT USING (
    league_id IN (
      SELECT league_id FROM league_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own picks" ON picks
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    league_id IN (
      SELECT league_id FROM league_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own picks" ON picks
  FOR UPDATE USING (
    user_id = auth.uid() AND
    league_id IN (
      SELECT league_id FROM league_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own picks" ON picks
  FOR DELETE USING (
    user_id = auth.uid() AND
    league_id IN (
      SELECT league_id FROM league_memberships 
      WHERE user_id = auth.uid()
    )
  );
