# Light The Lamp - NHL Fantasy League

A web application for NHL fantasy leagues where users join teams, pick players, and earn points based on performance.

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Real-time)
- **Deployment**: Vercel (recommended)

## Features

- 🏒 User authentication with Supabase
- 🏆 League management for NHL teams
- ⚡ Player selection and point tracking
- 🔄 Snake draft system for fair player selection
- 📱 Responsive design with modern UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lightTheLamp
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API
   - Copy your project URL and anon key

4. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # User dashboard after login
│   ├── page.tsx           # Home page with login/signup
│   └── layout.tsx         # Root layout
├── lib/
│   ├── supabase.ts        # Client-side Supabase client
│   └── supabase-server.ts # Server-side Supabase client
└── middleware.ts          # Authentication middleware
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

- [ ] Set up Supabase database schema
- [ ] Implement league creation and joining
- [ ] Add player selection interface
- [ ] Build scoring system
- [ ] Add real-time updates
- [ ] Create admin dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details