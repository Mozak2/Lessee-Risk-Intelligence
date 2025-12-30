# 🚀 Setup Guide - Airline Risk Intelligence

## Quick Start (Recommended - Supabase)

**New users should use Supabase** - it's faster, easier, and includes free hosting.

👉 **Follow the complete guide**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Quick steps:
1. Create free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project (takes 2 minutes)
3. Copy connection strings to `.env` file
4. Run: `npx prisma db push && npm run db:seed`
5. Start app: `npm run dev`

---

## Alternative: Local PostgreSQL Setup

If you prefer running PostgreSQL locally instead of using Supabase:

### Prerequisites

You need to install the following software before running this application:

### 1. Install Node.js and npm

**Download and Install:**
- Visit: https://nodejs.org/
- Download the **LTS version** (recommended)
- Run the installer and follow the setup wizard
- **Important:** Make sure to check the box that says "Add to PATH"

**Verify Installation:**
After installation, open a new PowerShell window and run:
```powershell
node --version
npm --version
```

You should see version numbers (e.g., v20.x.x and 10.x.x).

### 2. Install PostgreSQL Locally

**Download and Install:**
- Visit: https://www.postgresql.org/download/windows/
- Download the installer
- During installation:
  - Set a password for the postgres user (remember this!)
  - Default port: 5432 (keep this)
  - Install pgAdmin 4 (helpful for managing databases)

**Create Database:**
After installation, open pgAdmin 4 or use psql to create a database:
```sql
CREATE DATABASE airline_risk_db;
```

## Project Setup (Local PostgreSQL)

Once Node.js and PostgreSQL are installed:

### Step 1: Install Dependencies
```powershell
cd c:\Users\moiib\Lessee-Risk-Intelligence
npm install
```

### Step 2: Configure Environment Variables (Local)

Edit the `.env` file in the project root with your database credentials:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/airline_risk_db?schema=public"
```

Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

### Step 3: Initialize Database

Generate Prisma client and push schema to database:
```powershell
npm run db:generate
npm run db:push
```

### Step 4: Start Development Server
```powershell
npm run dev
```

Open your browser and navigate to: http://localhost:3000

## Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Restart your terminal after installing Node.js
- If still not working, manually add Node.js to PATH:
  - Search for "Environment Variables" in Windows
  - Add `C:\Program Files\nodejs` to PATH

### Database Connection Errors
- Verify PostgreSQL is running (check Services in Windows)
- Double-check your DATABASE_URL in `.env`
- Make sure the database `airline_risk_db` exists

### Port Already in Use (3000)
```powershell
# Find and kill process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

Or run on a different port:
```powershell
npm run dev -- -p 3001
```

## Optional: API Keys

The application works with mock data by default. To use real data:

### AviationStack API (Free Tier)
1. Sign up at: https://aviationstack.com/
2. Get your API key
3. Add to `.env`: `AVIATION_API_KEY="your_key_here"`

### Other APIs
- **REST Countries API**: No key required (already integrated)
- **OpenSky Network**: No key required (already integrated)

## Development Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Open Prisma Studio (database GUI)
npm run db:studio

# Create database migration
npm run db:migrate

# Push schema changes without migration
npm run db:push

# Regenerate Prisma client
npm run db:generate
```

## Next Steps After Setup

1. **Test the application:**
   - Visit http://localhost:3000
   - Search for airlines (try "AAL", "UAL", "DAL")
   - Create a portfolio
   - Add exposures to airlines

2. **Explore the codebase:**
   - `/app` - Next.js pages and API routes
   - `/lib` - Business logic and risk model
   - `/prisma` - Database schema

3. **Customize risk model:**
   - Edit weights in `/lib/sources/risk-sources.ts`
   - Add new risk sources for news or financial data

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are correctly installed
3. Check console/terminal for specific error messages
4. Review the README.md for more details

## Quick Start (After Prerequisites)

```powershell
# 1. Install dependencies
npm install

# 2. Set up database (edit .env first!)
npm run db:push
npm run db:generate

# 3. Start the app
npm run dev
```

Visit: http://localhost:3000
