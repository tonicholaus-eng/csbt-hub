CSBT HUB social preview patch

Changes:
- Homepage/social title: CSBT HUB | POGI NI NICH
- Open Graph preview image: public/og-image.png (1200x630)
- Twitter preview uses the same image

Extract this ZIP over your CSBT project root and overwrite matching files.
Then deploy with:
  git add .
  git commit -m "Update CSBT HUB social preview"
  git push origin main
  npm.cmd run deploy

After deployment, use Facebook Sharing Debugger and click Scrape Again for https://csbthub.com.
