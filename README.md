# Speyside BOL Manager - Phase 1

A modern, secure barrel shipping management system built with React, Supabase, and Vite.

## Features

✅ Three-role system (Admin, Supervisor, View-Only)
✅ Row-Level Security at database level
✅ Real-time load tracking
✅ BOL PDF generation
✅ File attachments & signatures
✅ Mobile-friendly interface

## Quick Start

### 1. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - **Project URL** (VITE_SUPABASE_URL)
   - **Anon Key** (VITE_SUPABASE_ANON_KEY)

### 2. Create .env.local

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_NAME=Speyside BOL Manager
VITE_ADMIN_EMAIL=ezaayer@speysidebci.com
```

### 3. Install Dependencies (Local Development Only)

```bash
npm install
```

### 4. Run Locally (Development Only)

```bash
npm run dev
```

Opens at http://localhost:3000

### 5. Build for Production

```bash
npm run build
```

Output in `dist/` folder

## Login Credentials

Use the credentials you created in Supabase Authentication:

- **Admin:** admin@speysidebci.com
- **Supervisor:** supervisor@speysidebci.com
- **Viewer:** viewer@speysidebci.com

## Project Structure

```
src/
├── lib/
│   ├── supabase.js       # Supabase client & API
│   └── bol-generator.js  # PDF generation
├── store/
│   └── store.js          # Zustand state
├── components/
│   └── Auth/
│       ├── LoginScreen.jsx
│       └── ProtectedRoute.jsx
├── App.jsx               # Router setup
├── main.jsx              # Entry point
└── index.css             # Tailwind + global styles
```

## Database Schema

See `01_database_schema_FIXED.sql` for complete schema including:

- `customers` - Core customer master data
- `carriers` - Shipping carrier information
- `barrel_specs` - Pre-configured barrel specifications
- `loads` - Individual barrel shipments
- `load_attachments` - PDFs, signatures, documents
- `user_roles` - Role-based access control
- `audit_log` - Change tracking

## Deployment to Cloudflare Pages

1. Push code to GitHub
2. Go to https://dash.cloudflare.com → Pages
3. Connect to your GitHub repository
4. Build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Build output: `dist`
5. Add environment variables
6. Deploy!

## Support

For questions about Phase 1 setup, see:
- `QUICK_START.md` - 1-hour setup guide
- `PHASE_1_SETUP.md` - Detailed checklist
- `02_SUPABASE_SETUP.md` - Supabase walkthrough

## Next Steps (Phase 2+)

- Supervisor Dashboard with production workflow
- Admin Schedule View for planning
- Monthly Schedule Viewer for read-only access
- Real-time load updates
- BOL PDF printing
- File attachment management

## Tech Stack

- **Frontend:** React 18, Vite
- **State:** Zustand
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **PDF:** PDFKit
- **Hosting:** Cloudflare Pages

## License

Internal use only - Speyside Bourbon Cooperage, Inc.
