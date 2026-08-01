# CSBT Live Community Feed setup

1. Create a Supabase project.
2. Open Supabase Dashboard > SQL Editor.
3. Run `supabase/community-feed.sql`.
4. Copy `.env.local.example` to `.env.local`.
5. Add your project's public URL and anon/publishable key.
6. Run:

   npm install
   npm run dev

7. Open http://localhost:3000

Authentication:
- Email and password sign-in is built into the component.
- Everyone can read the feed.
- Only authenticated users can create posts.
- Users can delete only their own posts.

Images:
- Accepted: JPG, PNG, WebP, GIF
- Maximum size: 5 MB
- Stored in the public `community-images` bucket.

Do not put a Supabase service-role key in `.env.local` or browser code.
