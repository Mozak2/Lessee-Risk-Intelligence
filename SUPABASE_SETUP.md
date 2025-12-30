# Supabase Migration Guide

This guide will help you migrate from SQLite to Supabase (PostgreSQL).

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose:
   - **Name**: `airline-risk-intelligence` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

5. Wait for the project to be created (~2 minutes)

## Step 2: Get Connection Strings

1. In your Supabase dashboard, go to **Settings** > **Database**
2. Scroll to **Connection String** section
3. You'll need TWO connection strings:

### Transaction Pooler (for Prisma queries)
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Direct Connection (for migrations)
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your database password (URL encoded if it contains special characters)

## Step 3: Update Environment Variables

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your Supabase connection strings:

```env
# Supabase PostgreSQL Connection Strings
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Optional API Keys
AVIATION_API_KEY=""
NEXT_PUBLIC_BASE_URL=""
```

**Security Note**: Never commit `.env` to git. It's already in `.gitignore`.

## Step 4: Push Database Schema to Supabase

Run these commands in order:

```powershell
# Generate Prisma client for PostgreSQL
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push

# Seed demo data
npm run db:seed
```

## Step 5: Verify Migration

1. Go to Supabase dashboard > **Table Editor**
2. You should see 4 tables:
   - `Airline`
   - `AirlineRiskSnapshot`
   - `Portfolio`
   - `LeaseExposure`

3. Check the `Airline` table - it should have 4 demo airlines (AAL, BAW, DLH, DAL)

## Step 6: Run Your App

```powershell
npm run dev
```

Visit `http://localhost:3000` and verify:
- Airlines page shows 4 demo airlines
- Portfolio page shows "Sample Leasing Portfolio"
- Risk scores are calculated correctly

## Troubleshooting

### Connection Issues

**Error**: `Can't reach database server`
- Check your connection strings are correct
- Verify your database password
- Ensure your Supabase project is active (not paused)

**Error**: `SSL connection required`
- Add `?sslmode=require` to the end of your connection strings

### Migration Issues

**Error**: `relation "Airline" already exists`
- Your tables already exist. Use `npx prisma db push --force-reset` to reset (⚠️ deletes all data)

**Error**: `prepared statement "s0" already exists`
- You're using the pooler connection for migrations. Use `DIRECT_URL` for migrations:
  ```powershell
  npx prisma db push --url=$env:DIRECT_URL
  ```

### Seed Issues

**Error**: `Airlines not found after seeding`
- Check that `db push` completed successfully
- Verify connection strings are correct
- Run seed again: `npm run db:seed`

## Key Differences from SQLite

### 1. Connection Pooling
- Supabase uses PgBouncer for connection pooling
- Use `DATABASE_URL` (pooler) for queries
- Use `DIRECT_URL` (direct) for migrations

### 2. No Auto-increment IDs
- We use `@default(cuid())` for IDs (works on both SQLite and PostgreSQL)
- No changes needed to your code

### 3. Better Performance
- PostgreSQL is more scalable than SQLite
- Supports concurrent connections
- Better for production use

### 4. Free Tier Limits
- 500 MB database
- Unlimited API requests
- Auto-pauses after 1 week of inactivity (free tier)

## Next Steps

### Optional: Enable Row Level Security (RLS)

For production, enable RLS in Supabase:

1. Go to **Authentication** > **Policies**
2. Enable RLS on each table
3. Create policies for your use case

Example policy (read-only public access):
```sql
CREATE POLICY "Allow public read access" ON "Airline"
  FOR SELECT
  USING (true);
```

### Optional: Set up Backups

Supabase free tier includes:
- Daily backups (7 days retention)
- Point-in-time recovery available on Pro plan

Access backups: **Database** > **Backups**

## Reverting to SQLite

If you need to revert:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. Update `.env`:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```

3. Reset database:
   ```powershell
   npx prisma db push
   npm run db:seed
   ```
