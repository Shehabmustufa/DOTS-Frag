#!/bin/bash
# Replace placeholders in environment.prod.ts with Vercel env vars
sed -i "s|__SUPABASE_URL__|${SUPABASE_URL}|g" src/environments/environment.prod.ts
sed -i "s|__SUPABASE_KEY__|${SUPABASE_KEY}|g" src/environments/environment.prod.ts

# Build Angular
npx ng build --configuration=production
