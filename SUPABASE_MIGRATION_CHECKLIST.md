# Supabase Migration Checklist

## ✅ Prerequisites
- [ ] Node.js 18+ installed
- [ ] Supabase account created (free tier is fine)
- [ ] Git repository cloned locally

## 🎯 Migration Steps

### 1. Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Click "New Project"
- [ ] Set project name: `airline-risk-intelligence`
- [ ] Choose strong database password (save it!)
- [ ] Select region closest to users
- [ ] Wait ~2 minutes for provisioning

### 2. Get Connection Strings
- [ ] Navigate to: Settings > Database > Connection String
- [ ] Copy **Transaction pooler** connection (port 6543)
- [ ] Copy **Direct connection** (port 5432)
- [ ] Replace `[YOUR-PASSWORD]` with your password in both

### 3. Update Local Environment
- [ ] Create `.env` file in project root
- [ ] Add `DATABASE_URL` (transaction pooler connection)
- [ ] Add `DIRECT_URL` (direct connection)
- [ ] Verify `.env` is in `.gitignore`

### 4. Update Codebase
- [ ] ✅ Already done: `prisma/schema.prisma` updated to PostgreSQL
- [ ] ✅ Already done: `.env.example` updated with Supabase format

### 5. Initialize Database
Run these commands in order:
```powershell
# Clean old Prisma client
Remove-Item -Recurse -Force node_modules\.prisma

# Generate new Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Seed demo data
npm run db:seed
```

- [ ] Prisma client generated successfully
- [ ] Schema pushed without errors
- [ ] Seed completed successfully

### 6. Verify in Supabase Dashboard
- [ ] Open Supabase Dashboard > Table Editor
- [ ] Verify `Airline` table exists (4 airlines: AAL, BAW, DLH, DAL)
- [ ] Verify `Portfolio` table exists (1 portfolio: Sample Leasing Portfolio)
- [ ] Verify `LeaseExposure` table exists (4 exposures)
- [ ] Verify `AirlineRiskSnapshot` table exists (4 snapshots)

### 7. Test Application
```powershell
npm run dev
```

- [ ] App starts without errors
- [ ] Visit http://localhost:3000
- [ ] Airlines page loads with 4 airlines
- [ ] Click on an airline → risk details display
- [ ] Portfolios page shows Sample portfolio
- [ ] Click portfolio → exposures display
- [ ] Add new exposure works
- [ ] Edit exposure works
- [ ] Delete exposure works (except sample portfolio)

### 8. Verify Risk Calculations
- [ ] Airline detail page shows overall risk score
- [ ] 4 risk components display:
  - Jurisdiction Risk (proxy)
  - Scale & Network Strength
  - Fleet & Asset Liquidity (proxy)
  - Financial Strength
- [ ] Confidence badges show (HIGH/MEDIUM/LOW)
- [ ] Missing data shows "Data unavailable" not "50"

## 🔧 Troubleshooting

### Common Issues

**Can't connect to database:**
- Verify connection strings are correct
- Check password is properly URL-encoded
- Ensure project is not paused (Supabase dashboard)

**Schema push fails:**
- Delete `.env` and recreate with correct format
- Use `DIRECT_URL` for migrations: `npx prisma db push --url=$env:DIRECT_URL`

**Seed fails:**
- Verify tables were created: check Supabase Table Editor
- Run seed again: `npm run db:seed`
- Check for typos in airline ICAO codes

**App shows old SQLite data:**
- Clear browser cache
- Restart dev server
- Verify `DATABASE_URL` in `.env` points to Supabase

## 📊 Success Criteria

- ✅ All tables created in Supabase
- ✅ Demo data seeded (4 airlines, 1 portfolio, 4 exposures)
- ✅ App loads without database errors
- ✅ Risk scores calculate correctly
- ✅ CRUD operations work on portfolios/exposures
- ✅ Dark mode works
- ✅ No console errors

## 🚀 Next Steps (Optional)

### Security
- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Create access policies for tables
- [ ] Set up authentication (NextAuth.js)

### Performance
- [ ] Enable Supabase connection pooling (already configured)
- [ ] Add database indexes for frequently queried fields (already done in schema)
- [ ] Set up caching for risk calculations (already implemented)

### Monitoring
- [ ] Enable Supabase logs in dashboard
- [ ] Set up query performance monitoring
- [ ] Configure database usage alerts

### Backups
- [ ] Verify daily backups are enabled (Supabase Dashboard > Database > Backups)
- [ ] Test backup restoration process
- [ ] Consider upgrading to Pro for point-in-time recovery

## 📝 Rollback Plan

If migration fails, revert to SQLite:

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

3. Regenerate and seed:
   ```powershell
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

## ✅ Migration Complete!

Congratulations! Your app is now running on Supabase PostgreSQL.

- **Free tier**: 500MB database, unlimited API requests
- **Auto-pause**: After 1 week inactivity (free tier)
- **Backups**: Daily (7 days retention)
- **Scaling**: Upgrade to Pro as needed

For questions or issues, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
