# Start Here: GCash + Elve Shark Upgrade

This is the upgraded copy of the project you uploaded as `DOUBLE CHECK.zip`.

## First local test

Open this project folder in VS Code, then run:

```powershell
npm install
npm run data:validate
npm run test:nich
npm run dev
```

Open:

```text
http://localhost:3000
```

Test these examples:

```text
What is Frost Dragon worth using GCash values?
What is Frost Dragon worth using Elve Shark values?
WFL me FR Frost Dragon them FR Owl using Elve values
```

Expected Frost Dragon values in the included snapshot:

```text
GCash: Regular 3800, Neon 7200, Mega 20000
Elve Shark: Regular 304, Neon 543, Mega 1610
```

## Update Elve Shark values manually

With an internet connection:

```powershell
npm run refresh:values
```

If the Elve extraction fails, the command reports an error and keeps the existing last-known-good values.

## Enable automatic updates

Push the project to GitHub and enable Actions. The included workflow checks Elve Shark values daily and commits only when the values change.

Read `VALUE_SYSTEMS.md` for the full explanation and `GCASH_ELVE_UPGRADE_CHANGES.md` for the change list.
