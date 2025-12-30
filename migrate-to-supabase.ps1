# Supabase Migration Script
# Run this after setting up your .env file with Supabase connection strings

Write-Host "🚀 Starting Supabase Migration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with your Supabase connection strings:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host 'DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"'
    Write-Host 'DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@...pooler.supabase.com:5432/postgres"'
    Write-Host ""
    Write-Host "See SUPABASE_SETUP.md for detailed instructions." -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL contains supabase
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "supabase") {
    Write-Host "⚠️  Warning: .env doesn't appear to contain Supabase connection strings" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

Write-Host "📦 Step 1: Cleaning old Prisma client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "   ✅ Cleaned successfully" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No old client found (this is fine)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "🔧 Step 2: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Generated successfully" -ForegroundColor Green
Write-Host ""

Write-Host "🗄️  Step 3: Pushing schema to Supabase..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to push schema" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Check your connection strings in .env" -ForegroundColor Gray
    Write-Host "  - Verify your Supabase project is active" -ForegroundColor Gray
    Write-Host "  - Try using DIRECT_URL: npx prisma db push --url=`$env:DIRECT_URL" -ForegroundColor Gray
    exit 1
}
Write-Host "   ✅ Schema pushed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "🌱 Step 4: Seeding demo data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to seed data" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Seeded successfully" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify in Supabase Dashboard > Table Editor" -ForegroundColor White
Write-Host "  2. Run: npm run dev" -ForegroundColor White
Write-Host "  3. Visit: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Expected data:" -ForegroundColor Cyan
Write-Host "  - 4 airlines (AAL, BAW, DLH, DAL)" -ForegroundColor Gray
Write-Host "  - 1 portfolio (Sample Leasing Portfolio)" -ForegroundColor Gray
Write-Host "  - 4 lease exposures" -ForegroundColor Gray
Write-Host ""
