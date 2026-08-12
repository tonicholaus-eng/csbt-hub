export type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  country_code: string | null;
  roblox_username: string | null;
  roblox_user_id: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
