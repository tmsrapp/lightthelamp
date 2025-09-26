const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample users to seed
const usersToSeed = [
  {
    user_id: 'seed-user-1',
    email: 'alex.johnson@example.com',
    display_name: 'Alex Johnson',
    favorite_team: 'Detroit Red Wings'
  },
  {
    user_id: 'seed-user-2', 
    email: 'sarah.williams@example.com',
    display_name: 'Sarah Williams',
    favorite_team: 'Toronto Maple Leafs'
  },
  {
    user_id: 'seed-user-3',
    email: 'mike.brown@example.com', 
    display_name: 'Mike Brown',
    favorite_team: 'Boston Bruins'
  },
  {
    user_id: 'seed-user-4',
    email: 'emma.davis@example.com',
    display_name: 'Emma Davis',
    favorite_team: 'Chicago Blackhawks'
  },
  {
    user_id: 'seed-user-5',
    email: 'chris.miller@example.com',
    display_name: 'Chris Miller', 
    favorite_team: 'Pittsburgh Penguins'
  },
  {
    user_id: 'seed-user-6',
    email: 'jessica.garcia@example.com',
    display_name: 'Jessica Garcia',
    favorite_team: 'New York Rangers'
  }
];

// League IDs from the API response
const leagueIds = [
  '5588d4e8-d5a3-4fd7-b79b-2f03685bb513', // "and electric"
  '9a6270dd-7938-4393-8b50-51f8079aa692'  // "Family Heating and Cooling"
];

async function seedUsers() {
  console.log('🌱 Starting user seeding...');
  
  try {
    // Insert user profiles
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .upsert(usersToSeed, { onConflict: 'user_id' })
      .select();

    if (profilesError) {
      console.error('❌ Error seeding user profiles:', profilesError);
      return;
    }

    console.log('✅ Seeded', userProfiles.length, 'user profiles');

    // Add users to leagues
    const leagueMemberships = [];
    
    // Add first 3 users to "and electric" league
    for (let i = 0; i < 3; i++) {
      leagueMemberships.push({
        league_id: leagueIds[0],
        user_id: usersToSeed[i].user_id,
        joined_at: new Date().toISOString()
      });
    }
    
    // Add last 3 users to "Family Heating and Cooling" league
    for (let i = 3; i < 6; i++) {
      leagueMemberships.push({
        league_id: leagueIds[1], 
        user_id: usersToSeed[i].user_id,
        joined_at: new Date().toISOString()
      });
    }

    // Insert league memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('league_memberships')
      .upsert(leagueMemberships, { onConflict: 'league_id,user_id' })
      .select();

    if (membershipsError) {
      console.error('❌ Error seeding league memberships:', membershipsError);
      return;
    }

    console.log('✅ Added', memberships.length, 'league memberships');

    // Update league pot amounts
    const { error: potError } = await supabase
      .from('leagues')
      .update({ pot_amount: 1500 })
      .in('id', leagueIds);

    if (potError) {
      console.error('❌ Error updating league pots:', potError);
      return;
    }

    console.log('✅ Updated league pot amounts to $1,500');

    console.log('🎉 Seeding completed successfully!');
    
    // Show final league stats
    const { data: finalLeagues } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        pot_amount,
        league_memberships(count)
      `)
      .in('id', leagueIds);

    console.log('\n📊 Final League Stats:');
    finalLeagues?.forEach(league => {
      console.log(`- ${league.name}: ${league.league_memberships[0].count} members, $${league.pot_amount}`);
    });

  } catch (error) {
    console.error('💥 Seeding failed:', error);
  }
}

seedUsers();
