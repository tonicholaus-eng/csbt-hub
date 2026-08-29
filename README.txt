CSBT HUB Messenger/Facebook preview cache-bust patch

Changes:
- Keeps title: CSBT HUB | POGI NI NICH
- Changes Open Graph image URL from /og-image.png to /csbt-preview-v3.png
- Changes Twitter image URL to /csbt-preview-v3.png
- Adds public/csbt-preview-v3.png (1200x630)

Extract this ZIP over the project root and overwrite src/app/layout.tsx.
The old public/og-image.png may remain; it is no longer referenced.

Deploy:
git add .
git commit -m "Refresh CSBT social preview asset"
git push origin main
npm.cmd run deploy

After deploy:
1. Meta Batch Invalidator: https://csbthub.com/
2. Sharing Debugger: https://csbthub.com/
3. Scrape Again
4. Send a brand-new https://csbthub.com/ message in Messenger.
