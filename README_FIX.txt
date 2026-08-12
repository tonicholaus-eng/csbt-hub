CSBT GCash Master Preservation Fix

Cause fixed:
- Some master workbooks already used ITEM NAME.
- Older sync logic appended a second PET NAME column and then added duplicate Elve-only rows.
- The generator treated the blank PET NAME cell on the original GCash row as authoritative, so it skipped ITEM NAME and discarded the original GCash row.

This patch:
1. Makes the generator skip blank alias cells and continue to ITEM NAME/PET NAME alternatives.
2. Makes the Elve master sync prefer the left-most existing name/image alias instead of appending a duplicate semantic column.
3. Automatically merges duplicate rows by item name, preserving the first/original row and filling only blank cells from duplicates.
4. Never overwrites existing GCash values while syncing Elve.

Apply the scripts folder over your project, then CLOSE Excel/WPS and run:

npm run sync:master
npm run generate:data
npm run data:validate

Verify Frost Dragon:
node -e "const d=require('./src/data/tradingItems.json'); console.log(d.find(x=>x.NAME==='Frost Dragon'))"

Expected GCash values should no longer be null.

After verifying locally:
npm run dev

Only after the website looks correct should you deploy:
git add .
git commit -m "Fix GCash master sync and preserve item values"
git push origin main
