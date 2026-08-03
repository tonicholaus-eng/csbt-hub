# Apply the Home Page Optimization Patch

1. Stop the development server with `Ctrl + C`.
2. Back up your current project folder.
3. Extract the patch ZIP.
4. Copy everything inside the extracted patch folder into your project root—the folder that contains `package.json`.
5. Choose **Replace the files in the destination** when Windows asks.
6. Do not delete or replace `.env.local`.
7. Run:

```powershell
npm run data:validate
npm run test:nich
npm run dev
```

Open `http://localhost:3000` and test the home page in both light and dark mode.

The patch also includes the updated generator. Future `npm run refresh:values` runs will regenerate the lightweight home metadata automatically.
