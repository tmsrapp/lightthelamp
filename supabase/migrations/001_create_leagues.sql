-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create league_memberships table
CREATE TABLE IF NOT EXISTS league_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for leagues table
CREATE POLICY "Anyone can view leagues" ON leagues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create leagues" ON leagues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "League creators can update their leagues" ON leagues
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "League creators can delete their leagues" ON leagues
  FOR DELETE USING (auth.uid() = created_by);

-- Create policies for league_memberships table
CREATE POLICY "Anyone can view league memberships" ON league_memberships
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join leagues" ON league_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues" ON league_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);
CREATE INDEX IF NOT EXISTS idx_league_memberships_league_id ON league_memberships(league_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_user_id ON league_memberships(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_leagues_updated_at 
  BEFORE UPDATE ON leagues 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
