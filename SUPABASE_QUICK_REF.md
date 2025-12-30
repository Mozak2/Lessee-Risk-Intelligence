# 🚀 Supabase Migration - Quick Reference

## TL;DR - 5 Minute Setup

### 1. Get Supabase Credentials (2 min)
- Go to [supabase.com](https://supabase.com) → New Project
- Copy connection strings from Settings > Database

### 2. Configure Locally (1 min)
Create `.env`:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 3. Run Migration (2 min)
```powershell
npm run supabase:migrate
```

### 4. Start App
```powershell
npm run dev
```

Done! 🎉

---

## Manual Steps (if script fails)

```powershell
# Clean cache
Remove-Item -Recurse -Force node_modules\.prisma

# Generate client
npx prisma generate

# Push schema
npx prisma db push

# Seed data
npm run db:seed

# Run app
npm run dev
```

---

## Connection String Format

### DATABASE_URL (for app queries - use pooler)
```
postgresql://postgres.PROJECT_ID:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### DIRECT_URL (for migrations - direct connection)
```
postgresql://postgres.PROJECT_ID:[PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**Note**: Replace `[PASSWORD]` with your actual database password. Use the same password for both.

---

## What Changed?

### ✅ Updated Files
- `prisma/schema.prisma` - Changed from SQLite to PostgreSQL
- `.env.example` - Added Supabase connection string templates
- `README.md` - Updated setup instructions
- `SETUP.md` - Added Supabase quick start

### 📄 New Files
- `SUPABASE_SETUP.md` - Detailed setup guide
- `SUPABASE_MIGRATION_CHECKLIST.md` - Step-by-step checklist
- `migrate-to-supabase.ps1` - Automated migration script

### 🔧 Schema Changes
- Provider changed from `sqlite` to `postgresql`
- Added `directUrl` for migrations
- No data model changes - everything is compatible!

---

## Verify Migration Success

### In Supabase Dashboard
1. Go to Table Editor
2. Check for 4 tables:
   - ✅ Airline (4 rows)
   - ✅ AirlineRiskSnapshot (4 rows)
   - ✅ Portfolio (1 row)
   - ✅ LeaseExposure (4 rows)

### In Your App
1. Visit http://localhost:3000
2. Check Airlines page → See 4 airlines
3. Check Portfolios page → See Sample portfolio
4. Click on AAL → See risk score and components

---

## Troubleshooting

### ❌ "Can't reach database server"
**Solution**: Check your connection strings in `.env`

### ❌ "SSL connection required"
**Solution**: Add `?sslmode=require` to connection strings

### ❌ "prepared statement already exists"
**Solution**: You're using pooler for migrations. Use:
```powershell
npx prisma db push --url=$env:DIRECT_URL
```

### ❌ Schema push succeeds but seed fails
**Solution**: 
1. Check Supabase Table Editor - are tables created?
2. Verify connection in `.env` is correct
3. Run seed again: `npm run db:seed`

### ❌ App shows "PrismaClient error"
**Solution**:
```powershell
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
npm run dev
```

---

## Useful Commands

```powershell
# View database in browser
npm run db:studio

# Reset and reseed (⚠️ deletes all data)
npx prisma db push --force-reset
npm run db:seed

# Generate Prisma client only
npx prisma generate

# Check connection (will prompt for password)
psql $env:DATABASE_URL
```

---

## Supabase Dashboard Quick Links

After logging in to Supabase:

- **Tables**: Left sidebar → Table Editor
- **SQL Editor**: Left sidebar → SQL Editor
- **Connection Strings**: Settings (⚙️) → Database → Connection String
- **Logs**: Left sidebar → Logs
- **Backups**: Database → Backups

---

## Free Tier Limits

- ✅ 500 MB database storage
- ✅ Unlimited API requests
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth
- ✅ Daily backups (7 days)
- ⚠️ Auto-pauses after 1 week inactivity

**To prevent pausing**: Visit your app at least once a week OR upgrade to Pro ($25/month).

---

## Rollback to SQLite

If you need to go back to SQLite:

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

3. Reset:
   ```powershell
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

---

## Need Help?

📚 **Documentation**:
- Full guide: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- Checklist: [SUPABASE_MIGRATION_CHECKLIST.md](./SUPABASE_MIGRATION_CHECKLIST.md)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Prisma Docs: [prisma.io/docs](https://www.prisma.io/docs)

🐛 **Issues**:
- Check TypeScript errors: Restart VS Code
- Database issues: Check Supabase Dashboard logs
- Prisma issues: Clear cache with `Remove-Item -Recurse -Force node_modules\.prisma`
