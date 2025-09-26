import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { migrationName } = body;

    if (!migrationName) {
      return NextResponse.json({ error: 'Migration name is required' }, { status: 400 });
    }

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', `${migrationName}.sql`);
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Migration executed successfully' });
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
