-- CSBT shared multi-game social/trading platform.
-- Adopt Me remains the canonical product structure; MM2 reuses the same Exchange,
-- Trade Opinions, Lounge, and Trade Room engine with its own validated catalog.

-- -----------------------------------------------------------------------------
-- 1. Shared game catalog used by server-side Exchange validation.
-- -----------------------------------------------------------------------------
create table if not exists public.game_catalog_items (
  game_id text not null,
  item_id text not null,
  item_name text not null,
  image_url text,
  category text not null default 'OTHER',
  demand_label text,
  demand_score numeric,
  supreme_value numeric,
  gcash_value numeric,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (game_id,item_id),
  constraint game_catalog_items_game_check check (game_id in ('adopt-me','mm2'))
);

alter table public.game_catalog_items enable row level security;
drop policy if exists "Game catalog is publicly readable" on public.game_catalog_items;
create policy "Game catalog is publicly readable" on public.game_catalog_items
for select to anon, authenticated using (true);
grant select on public.game_catalog_items to anon, authenticated;
create index if not exists game_catalog_items_game_name_idx on public.game_catalog_items (game_id,item_name);
create index if not exists game_catalog_items_game_category_idx on public.game_catalog_items (game_id,category);

-- Seed the bundled MM2 catalog. Values are point-in-time values from src/data/mm2Items.json.
insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-8bit-common','8Bit','https://supremevalues.com/media/mm2commons/8Bit.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-2015-common','2015','https://supremevalues.com/media/mm2commons/2015.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-abduction-uncommon','Abduction','https://supremevalues.com/media/mm2uncommons/Abduction.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-abstract-rare','Abstract','https://supremevalues.com/media/mm2rares/Abstract.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ace-rare','Ace','https://supremevalues.com/media/mm2rares/Ace.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-adurite-gun-uncommon','Adurite (Gun)','https://supremevalues.com/media/mm2uncommons/Adurite_Gun.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-adurite-knife-uncommon','Adurite (Knife)','https://supremevalues.com/media/mm2uncommons/Adurite_Knife.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-alex-common','Alex','https://supremevalues.com/media/mm2commons/Alex.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-alien-plush-untradable','Alien Plush','https://supremevalues.com/media/mm2untradables/Alien_Plush.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-alien-set-set','Alien Set','https://supremevalues.com/media/mm2godlies/Alienbeam.webp','SET','6/10',6,4700,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-alienbeam-godly','Alienbeam','https://supremevalues.com/media/mm2godlies/Alienbeam.webp','GODLY','6/10',6,2600,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-aliens-common','Aliens','https://supremevalues.com/media/mm2commons/Aliens.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-america-vintage','America','https://supremevalues.com/media/mm2vintages/America.webp','VINTAGE','1/10',1,7,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-amerilaser-godly','Amerilaser','https://supremevalues.com/media/mm2godlies/Amerilaser.webp','GODLY','1/10',1,22,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-apocalypse-gun-common','Apocalypse (Gun)','https://supremevalues.com/media/mm2commons/Apocalypse_Gun.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-apocalypse-knife-common','Apocalypse (Knife)','https://supremevalues.com/media/mm2commons/Apocalypse_Knife.webp','COMMON','2/10',2,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-aqua-common','Aqua','https://supremevalues.com/media/mm2commons/Aqua.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-aquarium-gun-legendary','Aquarium (Gun)','https://supremevalues.com/media/mm2legendaries/Aquarium_Gun.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-aquarium-knife-legendary','Aquarium (Knife)','https://supremevalues.com/media/mm2legendaries/Aquarium.webp','LEGENDARY','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-aquatic-untradable','Aquatic','https://supremevalues.com/media/mm2untradables/Aquatic.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-arctic-untradable','Arctic','https://supremevalues.com/media/mm2untradables/Arctic.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-arctic-gun-legendary','Arctic (Gun)','https://supremevalues.com/media/mm2legendaries/Arctic_Gun.webp','LEGENDARY','2/10',2,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-arctic-knife-legendary','Arctic (Knife)','https://supremevalues.com/media/mm2legendaries/Arctic_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-asteroid-common','Asteroid','https://supremevalues.com/media/mm2commons/Asteroid.webp','COMMON','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-aurora-untradable','Aurora','https://supremevalues.com/media/mm2untradables/Aurora.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-aurora-gun-legendary','Aurora (Gun)','https://supremevalues.com/media/mm2legendaries/Aurora_Gun.webp','LEGENDARY','2/10',2,45,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-aurora-knife-legendary','Aurora (Knife)','https://supremevalues.com/media/mm2legendaries/Aurora_Knife.webp','LEGENDARY','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-aurora-lights-untradable','Aurora Lights','https://supremevalues.com/media/mm2untradables/Aurora_Lights.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-aurora-set-legend-set','Aurora Set (Legend.)','https://supremevalues.com/media/mm2legendaries/Aurora_Gun.webp','SET','2/10',2,48,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-aurora-set-rare-set','Aurora Set (Rare)','https://supremevalues.com/media/mm2rares/Aurora_Knife.webp','SET','2/10',2,8,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-australis-godly','Australis','https://supremevalues.com/media/mm2godlies/Australis.webp','GODLY','2/10',2,140,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bacon-rare','Bacon','https://supremevalues.com/media/mm2rares/Bacon.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-badger-pet','Badger','https://supremevalues.com/media/mm2pets/Badger.webp','PET','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-balloons-common','Balloons','https://supremevalues.com/media/mm2commons/Balloons.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bat-godly','Bat','https://supremevalues.com/media/mm2godlies/Bat.webp','GODLY','2/10',2,120,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bat-set-set','Bat Set','https://supremevalues.com/media/mm2godlies/Bat.webp','SET','2/10',2,153,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-bat-swarm-2024-untradable','Bat Swarm (2024)','https://supremevalues.com/media/mm2untradables/Bat_Swarm.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bats-rare','Bats','https://supremevalues.com/media/mm2rares/Bats.webp','RARE','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bats-2020-common','Bats (2020)','https://supremevalues.com/media/mm2commons/Bats_2020.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bats-set-set','Bats Set','https://supremevalues.com/media/mm2commons/Bats_Knife.webp','SET','3/10',3,241,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-batswarm-untradable','Batswarm','https://supremevalues.com/media/mm2untradables/Batswarm.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-battleaxe-godly','Battleaxe','https://supremevalues.com/media/mm2godlies/Battleaxe.webp','GODLY','1/10',1,12,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-battleaxe-ii-godly','Battleaxe II','https://supremevalues.com/media/mm2godlies/BA2.webp','GODLY','1/10',1,17,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-batwing-ancient','Batwing','https://supremevalues.com/media/mm2ancients/Batwing.webp','ANCIENT','1/10',1,42,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-bauble-godly','Bauble','https://supremevalues.com/media/mm2godlies/Bauble.webp','GODLY','5/10',5,825,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bauble-set-set','Bauble Set','https://supremevalues.com/media/mm2godlies/Bauble.webp','SET','5/10',5,875,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-beach-legendary','Beach','https://supremevalues.com/media/mm2legendaries/Beach.webp','LEGENDARY','2/10',2,35,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-beach-ball-untradable','Beach Ball','https://supremevalues.com/media/mm2untradables/Beach_Ball.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-beach-set-set','Beach Set','https://supremevalues.com/media/mm2godlies/Beachy.webp','SET','2/10',2,220,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-beachy-godly','Beachy','https://supremevalues.com/media/mm2godlies/Beachy.webp','GODLY','2/10',2,110,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bear-pet','Bear','https://supremevalues.com/media/mm2pets/Bear.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bell-untradable','Bell','https://supremevalues.com/media/mm2untradables/Bell.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-bells-common','Bells','https://supremevalues.com/media/mm2commons/Bells.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-big-kill-common','Big Kill','https://supremevalues.com/media/mm2commons/Big_Kill.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bio-rare','Bio','https://supremevalues.com/media/mm2rares/Biogel.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bioblade-godly','Bioblade','https://supremevalues.com/media/mm2godlies/Bioblade.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-biogun-uncommon','Biogun','https://supremevalues.com/media/mm2uncommons/Biogun.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bit-common','Bit','https://supremevalues.com/media/mm2commons/Bit.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bitsplosion-untradable','Bitsplosion','https://supremevalues.com/media/mm2untradables/Bitsplosion.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-black-rare','Black','https://supremevalues.com/media/mm2rares/Black.webp','RARE','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-black-cat-pet','Black Cat','https://supremevalues.com/media/mm2pets/Black_Cat.webp','PET','3/10',3,70,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-black-luger-godly','Black Luger','https://supremevalues.com/media/mm2godlies/Black_Luger.webp','GODLY','10/10',10,1000000,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blaster-godly','Blaster','https://supremevalues.com/media/mm2godlies/Blaster.webp','GODLY','1/10',1,17,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bleached-common','Bleached','https://supremevalues.com/media/mm2commons/Bleached.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-blizzard-godly','Blizzard','https://supremevalues.com/media/mm2godlies/Blizzard.webp','GODLY','4/10',4,260,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blizzard-set-set','Blizzard Set','https://supremevalues.com/media/mm2godlies/Blizzard.webp','SET','4/10',4,520,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-blood-vintage','Blood','https://supremevalues.com/media/mm2vintages/Blood.webp','VINTAGE','1/10',1,8,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-bloom-godly','Bloom','https://supremevalues.com/media/mm2godlies/Bloom.webp','GODLY','5/10',5,400,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bloom-set-set','Bloom Set','https://supremevalues.com/media/mm2godlies/Bloom.webp','SET','5/10',5,810,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-blossom-godly','Blossom','https://supremevalues.com/media/mm2godlies/Blossom.webp','GODLY','6/10',6,1370,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blue-uncommon','Blue','https://supremevalues.com/media/mm2uncommons/Blue.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blue-candy-cane-untradable','Blue Candy Cane','https://supremevalues.com/media/mm2untradables/Blue_Candy_Cane.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-blue-candy-cane-18-untradable','Blue Candy Cane ''18','https://supremevalues.com/media/mm2untradables/Blue_Candy_Cane_18.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-blue-elite-legendary','Blue Elite','https://supremevalues.com/media/mm2legendaries/Blue_Elite.webp','LEGENDARY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blue-flaming-knife-untradable','Blue Flaming Knife','https://supremevalues.com/media/mm2untradables/Blue_Flaming_Knife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-blue-papers-misc','Blue Papers','https://supremevalues.com/media/mm2misc/Blue_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-blue-scratch-legendary','Blue Scratch','https://supremevalues.com/media/mm2legendaries/Blue_Scratch.webp','LEGENDARY','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blue-seer-godly','Blue Seer','https://supremevalues.com/media/mm2godlies/Blue_Seer.webp','GODLY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-blue-sparkletime-untradable','Blue Sparkletime','https://supremevalues.com/media/mm2untradables/Blue_Sparkletime.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-bluesteel-untradable','Bluesteel','https://supremevalues.com/media/mm2untradables/Bluesteel.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-bluesteel-gun-uncommon','Bluesteel (Gun)','https://supremevalues.com/media/mm2uncommons/Bluesteel_Gun.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bluesteel-knife-uncommon','Bluesteel (Knife)','https://supremevalues.com/media/mm2uncommons/Bluesteel_Knife.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bokeh-untradable','Bokeh','https://supremevalues.com/media/mm2untradables/Bokeh.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-boneblade-godly','Boneblade','https://supremevalues.com/media/mm2godlies/Boneblade.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bones-uncommon','Bones','https://supremevalues.com/media/mm2uncommons/Bones_Gun.webp','UNCOMMON','3/10',3,215,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bones-knife-rare','Bones (Knife)','https://supremevalues.com/media/mm2rares/Bones_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-boombastic-untradable','Boombastic','https://supremevalues.com/media/mm2untradables/Boombastic.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-boombox-untradable','Boombox','https://supremevalues.com/media/mm2untradables/Boombox.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-boosign-untradable','BooSign','https://supremevalues.com/media/mm2untradables/BooSign.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-borders-common','Borders','https://supremevalues.com/media/mm2commons/Borders.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-borealis-godly','Borealis','https://supremevalues.com/media/mm2godlies/Borealis.webp','GODLY','2/10',2,145,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-borealis-set-set','Borealis Set','https://supremevalues.com/media/mm2godlies/Borealis.webp','SET','2/10',2,285,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-bow-set-set','Bow Set','https://supremevalues.com/media/mm2ancients/Harvester.webp','SET','3/10',3,410,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-box-of-fertilizer-misc','Box of Fertilizer','https://supremevalues.com/media/mm2misc/Fert.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-brains-uncommon','Brains','https://supremevalues.com/media/mm2uncommons/Brains.webp','UNCOMMON','3/10',3,135,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-brains-2022-uncommon','Brains (2022)','https://supremevalues.com/media/mm2uncommons/Brains_2022.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-branches-uncommon','Branches','https://supremevalues.com/media/mm2uncommons/Branches.webp','UNCOMMON','3/10',3,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bringer-set-set','Bringer Set','https://supremevalues.com/media/mm2godlies/Darkbringer.webp','SET','1/10',1,66,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-broken-legendary','Broken','https://supremevalues.com/media/mm2legendaries/Broken.webp','LEGENDARY','2/10',2,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-brown-common','Brown','https://supremevalues.com/media/mm2commons/Brown.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-brush-uncommon','Brush','https://supremevalues.com/media/mm2uncommons/Brush.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bubble-blower-untradable','Bubble Blower','https://supremevalues.com/media/mm2untradables/Bubble_Blower.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-bubbles-legendary','Bubbles','https://supremevalues.com/media/mm2legendaries/Bubbles.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bubbly-untradable','Bubbly','https://supremevalues.com/media/mm2untradables/Bubbly.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bunnies-legendary','Bunnies','https://supremevalues.com/media/mm2legendaries/Bunnies.webp','LEGENDARY','2/10',2,4,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-bunny-common','Bunny','https://supremevalues.com/media/mm2commons/Bunny.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-bunny-toy-untradable','Bunny Toy','https://supremevalues.com/media/mm2untradables/Bunny_Toy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-butterflies-rare','Butterflies','https://supremevalues.com/media/mm2rares/Butterflies.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-camo-untradable','Camo','https://supremevalues.com/media/mm2untradables/Camo.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-camo-gun-uncommon','Camo (Gun)','https://supremevalues.com/media/mm2uncommons/Camo_Gun.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-camo-knife-uncommon','Camo (Knife)','https://supremevalues.com/media/mm2uncommons/Camo_Knife.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candied-gun-common','Candied (Gun)','https://supremevalues.com/media/mm2commons/Candied_Gun.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candied-knife-common','Candied (Knife)','https://supremevalues.com/media/mm2commons/Candied_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candies-untradable','Candies','https://supremevalues.com/media/mm2untradables/Candies.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candies-2016-misc','Candies (2016)','https://supremevalues.com/media/mm2misc/Candy_2016.webp','MISC','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candies-2017-misc','Candies (2017)','https://supremevalues.com/media/mm2misc/Candy_2017.webp','MISC','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candies-2023-untradable','Candies (2023)','https://supremevalues.com/media/mm2untradables/Candies2023.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candies-2022-untradable','Candies 2022','https://supremevalues.com/media/mm2untradables/Candies_2022.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candle-common','Candle','https://supremevalues.com/media/mm2commons/Candle.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candle-2025-untradable','Candle (2025)','https://supremevalues.com/media/mm2untradables/Candle_2025.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-candleflame-godly','Candleflame','https://supremevalues.com/media/mm2godlies/Candleflame.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candleflame-gun-rare','Candleflame (Gun)','https://supremevalues.com/media/mm2rares/Candleflame.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candles-common','Candles','https://supremevalues.com/media/mm2commons/Candles.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candy-godly','Candy','https://supremevalues.com/media/mm2godlies/Candy.webp','GODLY','1/10',1,80,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candy-bucket-untradable','Candy Bucket','https://supremevalues.com/media/mm2untradables/Candy_Bucket.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-candy-cane-untradable','Candy Cane','https://supremevalues.com/media/mm2untradables/Candy_Cane_18.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-candy-cane-18-untradable','Candy Cane ''18','https://supremevalues.com/media/mm2untradables/Cane.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-candy-cane-effect-untradable','Candy Cane Effect','https://supremevalues.com/media/mm2untradables/CandyCane.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candy-corn-2019-common','Candy Corn (2019)','https://supremevalues.com/media/mm2commons/Candy_Corn_2019.webp','COMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-candy-emote-untradable','Candy Emote','https://supremevalues.com/media/mm2untradables/Candy_Emote.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-candy-set-set','Candy Set','https://supremevalues.com/media/mm2godlies/Candy.webp','SET','1/10',1,112,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-candy-swirl-gun-rare','Candy Swirl (Gun)','https://supremevalues.com/media/mm2rares/Candy_Swirl_Gun.webp','RARE','2/10',2,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candy-swirl-knife-rare','Candy Swirl (Knife)','https://supremevalues.com/media/mm2rares/Candy_Swirl_Knife.webp','RARE','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-candy-swirl-set-set','Candy Swirl Set','https://supremevalues.com/media/mm2rares/Candy_Swirl_Gun.webp','SET','2/10',2,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-candycorn-2017-common','CandyCorn (2017)','https://supremevalues.com/media/mm2commons/CandyCorn.webp','COMMON','2/10',2,25,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cane-gun-common','Cane (Gun)','https://supremevalues.com/media/mm2commons/Cane_Gun.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cane-knife-common','Cane (Knife)','https://supremevalues.com/media/mm2commons/Cane_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-canes-gun-uncommon','Canes (Gun)','https://supremevalues.com/media/mm2uncommons/Canes_Gun.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-canes-knife-uncommon','Canes (Knife)','https://supremevalues.com/media/mm2uncommons/Canes_Knife.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cardboard-common','Cardboard','https://supremevalues.com/media/mm2commons/Cardboard.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-carrot-uncommon','Carrot','https://supremevalues.com/media/mm2uncommons/Carrot.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-carrot-gun-uncommon','Carrot (Gun)','https://supremevalues.com/media/mm2uncommons/Carrot_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-carrot-knife-uncommon','Carrot (Knife)','https://supremevalues.com/media/mm2uncommons/Carrot_Knife.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-carrot-bunny-pet','Carrot Bunny','https://supremevalues.com/media/mm2pets/Carrot_Bunny.webp','PET','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-carrots-common','Carrots','https://supremevalues.com/media/mm2commons/Carrots.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-carved-gun-common','Carved (Gun)','https://supremevalues.com/media/mm2commons/Carved_Gun.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-carved-knife-common','Carved (Knife)','https://supremevalues.com/media/mm2commons/Carved_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cat-common','Cat','https://supremevalues.com/media/mm2commons/Cats.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cat-eyes-untradable','Cat Eyes','https://supremevalues.com/media/mm2untradables/Cats_Eye.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cats-common','Cats','https://supremevalues.com/media/mm2commons/Bats_2025.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-caution-uncommon','Caution','https://supremevalues.com/media/mm2uncommons/Caution.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cavern-gun-legendary','Cavern (Gun)','https://supremevalues.com/media/mm2legendaries/Cavern_Gun.webp','LEGENDARY','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cavern-knife-legendary','Cavern (Knife)','https://supremevalues.com/media/mm2legendaries/Cavern_Knife.webp','LEGENDARY','2/10',2,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cavern-set-set','Cavern Set','https://supremevalues.com/media/mm2legendaries/Cavern_Knife.webp','SET','2/10',2,8,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-celestial-ancient','Celestial','https://supremevalues.com/media/mm2ancients/Celestial.webp','ANCIENT','5/10',5,2450,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-celestial-set-set','Celestial Set','https://supremevalues.com/media/mm2ancients/Celestial.webp','SET','5/10',5,5150,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-checkers-uncommon','Checkers','https://supremevalues.com/media/mm2uncommons/Checkers.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cheddar-uncommon','Cheddar','https://supremevalues.com/media/mm2uncommons/Cheddar.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cheesy-uncommon','Cheesy','https://supremevalues.com/media/mm2uncommons/Cheesy.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cherries-common','Cherries','https://supremevalues.com/media/mm2commons/Cherries.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cherry-common','Cherry','https://supremevalues.com/media/mm2commons/Cherry.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-chick-common','Chick','https://supremevalues.com/media/mm2commons/Chick.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-chill-godly','Chill','https://supremevalues.com/media/mm2godlies/Chill.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chilly-pet','Chilly','https://supremevalues.com/media/mm2pets/Chilly.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-choco-common','Choco','https://supremevalues.com/media/mm2commons/Choco.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-chocolate-milk-untradable','Chocolate Milk','https://supremevalues.com/media/mm2untradables/Chocolate_Milk.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-christmas-glow-untradable','Christmas Glow','https://supremevalues.com/media/mm2untradables/Christmas_Glow.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-chroma-alien-set-set','Chroma Alien Set','https://supremevalues.com/media/mm2chromas/CAB.webp','SET','6/10',6,38000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-alienbeam-chroma','Chroma Alienbeam','https://supremevalues.com/media/mm2chromas/CAB.webp','CHROMA','6/10',6,24000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-bauble-chroma','Chroma Bauble','https://supremevalues.com/media/mm2chromas/CBaub.webp','CHROMA','7/10',7,34000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-bauble-set-set','Chroma Bauble Set','https://supremevalues.com/media/mm2chromas/CBaub.webp','SET','7/10',7,35800,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-beach-set-set','Chroma Beach Set','https://supremevalues.com/media/N_A.webp','SET','5/10',5,2550,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-beachy-chroma','Chroma Beachy','https://supremevalues.com/media/N_A.webp','CHROMA','5/10',5,1250,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-blizzard-chroma','Chroma Blizzard','https://supremevalues.com/media/mm2chromas/CBZ.webp','CHROMA','5/10',5,5500,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-blizzard-set-set','Chroma Blizzard Set','https://supremevalues.com/media/mm2chromas/CBZ.webp','SET','5/10',5,9750,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-boneblade-chroma','Chroma Boneblade','https://supremevalues.com/media/mm2chromas/CBB.webp','CHROMA','1/10',1,22,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-bringer-set-set','Chroma Bringer Set','https://supremevalues.com/media/mm2chromas/CLB.webp','SET','1/10',1,125,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-candleflame-chroma','Chroma Candleflame','https://supremevalues.com/media/mm2chromas/CCF.webp','CHROMA','1/10',1,40,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-cookiecane-chroma','Chroma Cookiecane','https://supremevalues.com/media/mm2chromas/CCC.webp','CHROMA','1/10',1,32,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-darkbringer-chroma','Chroma Darkbringer','https://supremevalues.com/media/mm2chromas/CDB.webp','CHROMA','1/10',1,65,null,'2026-08-24T20:26:24.966Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-chroma-deathshard-chroma','Chroma Deathshard','https://supremevalues.com/media/mm2chromas/CDS.webp','CHROMA','1/10',1,35,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-ever-set-set','Chroma Ever Set','https://supremevalues.com/media/mm2chromas/CEvergun.webp','SET','8/10',8,123000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-evergreen-chroma','Chroma Evergreen','https://supremevalues.com/media/mm2chromas/CEvergreen.webp','CHROMA','7/10',7,48000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-evergun-chroma','Chroma Evergun','https://supremevalues.com/media/mm2chromas/CEvergun.webp','CHROMA','8/10',8,75000,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fang-chroma','Chroma Fang','https://supremevalues.com/media/mm2chromas/CFang.webp','CHROMA','1/10',1,32,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-bat-chroma','Chroma Fire Bat','https://supremevalues.com/media/mm2chromas/CBat.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-bear-chroma','Chroma Fire Bear','https://supremevalues.com/media/mm2chromas/CBear.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-bunny-chroma','Chroma Fire Bunny','https://supremevalues.com/media/mm2chromas/CBunny.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-cat-chroma','Chroma Fire Cat','https://supremevalues.com/media/mm2chromas/CCat.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-dog-chroma','Chroma Fire Dog','https://supremevalues.com/media/mm2chromas/CDog.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-fox-chroma','Chroma Fire Fox','https://supremevalues.com/media/mm2chromas/CFox.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-fire-pig-chroma','Chroma Fire Pig','https://supremevalues.com/media/mm2chromas/CPig.webp','CHROMA','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-gemstone-chroma','Chroma Gemstone','https://supremevalues.com/media/mm2chromas/CGem.webp','CHROMA','1/10',1,32,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-gingerblade-chroma','Chroma Gingerblade','https://supremevalues.com/media/mm2chromas/CGB.webp','CHROMA','1/10',1,27,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-heart-wand-chroma','Chroma Heart Wand','https://supremevalues.com/media/mm2chromas/CHW.webp','CHROMA','5/10',5,4250,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-heat-chroma','Chroma Heat','https://supremevalues.com/media/mm2chromas/CHeat.webp','CHROMA','1/10',1,28,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-icecream-chroma','Chroma Icecream','https://supremevalues.com/media/N_A.webp','CHROMA','5/10',5,1250,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-laser-chroma','Chroma Laser','https://supremevalues.com/media/mm2chromas/CLaser.webp','CHROMA','1/10',1,40,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-lightbringer-chroma','Chroma Lightbringer','https://supremevalues.com/media/mm2chromas/CLB.webp','CHROMA','1/10',1,60,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-luger-chroma','Chroma Luger','https://supremevalues.com/media/mm2chromas/CLuger.webp','CHROMA','1/10',1,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-ornament-chroma','Chroma Ornament','https://supremevalues.com/media/mm2chromas/COR.webp','CHROMA','5/10',5,1800,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-pet-set-set','Chroma Pet Set','https://supremevalues.com/media/mm2chromas/CBunny.webp','SET','1/10',1,21,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-raygun-chroma','Chroma Raygun','https://supremevalues.com/media/mm2chromas/CRG.webp','CHROMA','6/10',6,14000,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-sands-chroma','Chroma Sands','https://supremevalues.com/media/N_A.webp','CHROMA','5/10',5,1300,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-saw-chroma','Chroma Saw','https://supremevalues.com/media/mm2chromas/CSaw.webp','CHROMA','1/10',1,23,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-seer-chroma','Chroma Seer','https://supremevalues.com/media/mm2chromas/CSeer.webp','CHROMA','1/10',1,28,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-shark-chroma','Chroma Shark','https://supremevalues.com/media/mm2chromas/CShark.webp','CHROMA','1/10',1,32,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-slasher-chroma','Chroma Slasher','https://supremevalues.com/media/mm2chromas/CSlasher.webp','CHROMA','1/10',1,32,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-slasher-set-set','Chroma Slasher Set','https://supremevalues.com/media/mm2chromas/CSlasher.webp','SET','1/10',1,72,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-snow-dagger-chroma','Chroma Snow Dagger','https://supremevalues.com/media/mm2chromas/CDagger.webp','CHROMA','5/10',5,2500,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-snow-set-set','Chroma Snow Set','https://supremevalues.com/media/mm2chromas/CCannon.webp','SET','5/10',5,10250,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-snowcannon-chroma','Chroma Snowcannon','https://supremevalues.com/media/mm2chromas/CCannon.webp','CHROMA','5/10',5,7750,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-snowstorm-chroma','Chroma Snowstorm','https://supremevalues.com/media/mm2chromas/CSnowstorm.webp','CHROMA','5/10',5,4250,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-sun-set-set','Chroma Sun Set','https://supremevalues.com/media/mm2chromas/CSR.webp','SET','6/10',6,22250,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-sunrise-chroma','Chroma Sunrise','https://supremevalues.com/media/mm2chromas/CSR.webp','CHROMA','6/10',6,13250,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-sunset-chroma','Chroma Sunset','https://supremevalues.com/media/mm2chromas/CSS.webp','CHROMA','5/10',5,9000,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-sweet-chroma','Chroma Sweet','https://supremevalues.com/media/mm2chromas/CSweet.webp','CHROMA','5/10',5,2000,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-sweet-set-set','Chroma Sweet Set','https://supremevalues.com/media/mm2chromas/CTreat.webp','SET','5/10',5,4150,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chroma-swirly-gun-chroma','Chroma Swirly Gun','https://supremevalues.com/media/mm2chromas/CSG.webp','CHROMA','1/10',1,38,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-tides-chroma','Chroma Tides','https://supremevalues.com/media/mm2chromas/CTides.webp','CHROMA','1/10',1,27,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-treat-chroma','Chroma Treat','https://supremevalues.com/media/mm2chromas/CTreat.webp','CHROMA','5/10',5,2150,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-watergun-chroma','Chroma Watergun','https://supremevalues.com/media/mm2chromas/CWG.webp','CHROMA','5/10',5,3400,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chroma-weapon-set-set','Chroma Weapon Set','https://supremevalues.com/media/mm2chromas/CLuger.webp','SET','1/10',1,535,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-chromatic-gun-legendary','Chromatic (Gun)','https://supremevalues.com/media/mm2legendaries/Chromatic_Gun.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-chromatic-knife-legendary','Chromatic (Knife)','https://supremevalues.com/media/mm2legendaries/Chromatic_Knife.webp','LEGENDARY','2/10',2,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-circuit-uncommon','Circuit','https://supremevalues.com/media/mm2uncommons/Circuit.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-clan-common','Clan','https://supremevalues.com/media/mm2commons/Clan.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-clockwork-godly','Clockwork','https://supremevalues.com/media/mm2godlies/Clockwork.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-clown-gun-uncommon','Clown (Gun)','https://supremevalues.com/media/mm2uncommons/Clown_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-clown-knife-common','Clown (Knife)','https://supremevalues.com/media/mm2commons/Clown_Knife.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-clownfish-gun-common','Clownfish (Gun)','https://supremevalues.com/media/mm2commons/Clownfish_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-clownfish-knife-common','Clownfish (Knife)','https://supremevalues.com/media/mm2commons/Clownfish_Knife.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-coal-common','Coal','https://supremevalues.com/media/mm2commons/Coal_2017.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-coconut-common','Coconut','https://supremevalues.com/media/mm2commons/Coconut.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cold-common','Cold','https://supremevalues.com/media/mm2commons/Cold.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-colored-seer-set-set','Colored Seer Set','https://supremevalues.com/media/mm2godlies/Red_Seer.webp','SET','1/10',1,16,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-combat-common','Combat','https://supremevalues.com/media/mm2commons/Combat.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-combat-ii-common','Combat II','https://supremevalues.com/media/mm2commons/Combat_2.webp','COMMON','2/10',2,10,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-common-ornament-untradable','Common Ornament','https://supremevalues.com/media/mm2untradables/Common_Ornament.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-confetti-untradable','Confetti','https://supremevalues.com/media/mm2untradables/Confetti.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-constellation-godly','Constellation','https://supremevalues.com/media/mm2godlies/Constellation.webp','GODLY','5/10',5,2700,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cookie-untradable','Cookie','https://supremevalues.com/media/mm2untradables/Cookie.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-cookie-gun-uncommon','Cookie (Gun)','https://supremevalues.com/media/mm2uncommons/Cookie_Gun.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cookie-knife-uncommon','Cookie (Knife)','https://supremevalues.com/media/mm2uncommons/Cookie_Knife.webp','UNCOMMON','2/10',2,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cookie-set-set','Cookie Set','https://supremevalues.com/media/mm2godlies/Cookiecane.webp','SET','1/10',1,25,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-cookieblade-godly','Cookieblade','https://supremevalues.com/media/mm2godlies/Cookieblade.webp','GODLY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cookiecane-godly','Cookiecane','https://supremevalues.com/media/mm2godlies/Cookiecane.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-copper-common','Copper','https://supremevalues.com/media/mm2commons/Copper.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-corl-common','Corl','https://supremevalues.com/media/mm2commons/Corl.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-corrupt-unique','Corrupt','https://supremevalues.com/media/mm2uniques/Corrupt.webp','UNIQUE','4/10',4,375,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-corrupt-set-set','Corrupt Set','https://supremevalues.com/media/mm2uniques/Corrupt.webp','SET','4/10',4,405,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-cotton-candy-legendary','Cotton Candy','https://supremevalues.com/media/mm2legendaries/Cotton_Candy.webp','LEGENDARY','2/10',2,35,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cowboy-vintage','Cowboy','https://supremevalues.com/media/mm2vintages/Cowboy.webp','VINTAGE','1/10',1,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-cracks-gun-common','Cracks (Gun)','https://supremevalues.com/media/mm2commons/Cracks_Gun.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cracks-knife-common','Cracks (Knife)','https://supremevalues.com/media/mm2commons/Cracks_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cupid-legendary','Cupid','https://supremevalues.com/media/mm2legendaries/Cupid.webp','LEGENDARY','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-curse-rare','Curse','https://supremevalues.com/media/mm2rares/Curse.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cursed-untradable','Cursed','https://supremevalues.com/media/mm2untradables/Cursed.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-cursed-gun-legendary','Cursed (Gun)','https://supremevalues.com/media/mm2legendaries/Cursed_Gun.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-cursed-knife-legendary','Cursed (Knife)','https://supremevalues.com/media/mm2legendaries/Cursed_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-dab-untradable','Dab','https://supremevalues.com/media/mm2untradables/Dab.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-damp-rare','Damp','https://supremevalues.com/media/mm2rares/Damp.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-dark-set-set','Dark Set','https://supremevalues.com/media/mm2godlies/Darksword.webp','SET','6/10',6,3575,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-dark-set-rare-set','Dark Set (Rare)','https://supremevalues.com/media/mm2rares/Darkknife.webp','SET','3/10',3,71,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-darkbringer-godly','Darkbringer','https://supremevalues.com/media/mm2godlies/Darkbringer.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-darkfire-untradable','Darkfire','https://supremevalues.com/media/mm2untradables/Darkfire.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-darkgun-rare','Darkgun','https://supremevalues.com/media/mm2rares/Darkgun.webp','RARE','2/10',2,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-darkknife-rare','Darkknife','https://supremevalues.com/media/mm2rares/Darkknife.webp','RARE','3/10',3,70,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-darkness-gun-common','Darkness (Gun)','https://supremevalues.com/media/mm2commons/Darkness_Gun.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-darkness-knife-common','Darkness (Knife)','https://supremevalues.com/media/mm2commons/Darkness_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-darkshot-godly','Darkshot','https://supremevalues.com/media/mm2godlies/Darkshot.webp','GODLY','6/10',6,1800,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-darkswirl-untradable','Darkswirl','https://supremevalues.com/media/mm2untradables/Darkswirl.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-darksword-godly','Darksword','https://supremevalues.com/media/mm2godlies/Darksword.webp','GODLY','6/10',6,1775,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-deathshard-godly','Deathshard','https://supremevalues.com/media/mm2godlies/Deathshard.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-deathspeaker-pet','Deathspeaker','https://supremevalues.com/media/mm2pets/Deathspeaker.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-decorated-uncommon','Decorated','https://supremevalues.com/media/mm2uncommons/Decorated.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-decoy-untradable','Decoy','https://supremevalues.com/media/mm2untradables/Decoy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-deep-sea-rare','Deep Sea','https://supremevalues.com/media/mm2rares/Deep_Sea.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-default-radio-untradable','Default Radio','https://supremevalues.com/media/mm2untradables/Default.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-denis-common','Denis','https://supremevalues.com/media/mm2commons/Denis.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-diamond-untradable','Diamond','https://supremevalues.com/media/mm2untradables/Diamond.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-dog-pet','Dog','https://supremevalues.com/media/mm2pets/Dog.webp','PET','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-doge-uncommon','Doge','https://supremevalues.com/media/mm2uncommons/Doge.webp','UNCOMMON','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-dogey-pet','Dogey','https://supremevalues.com/media/mm2pets/Dogey.webp','PET','3/10',3,150,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-dolphins-common','Dolphins','https://supremevalues.com/media/mm2commons/Dolphins.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-donut-uncommon','Donut','https://supremevalues.com/media/mm2uncommons/Donut.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-dual-wield-untradable','Dual Wield','https://supremevalues.com/media/mm2untradables/Dual_Wield.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-dubstep-untradable','Dubstep','https://supremevalues.com/media/mm2untradables/Dubstep.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-duckies-common','Duckies','https://supremevalues.com/media/mm2commons/Duckies.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-dungeon-rare','Dungeon','https://supremevalues.com/media/mm2rares/Dungeon.webp','RARE','3/10',3,175,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-easter-glow-untradable','Easter Glow','https://supremevalues.com/media/mm2untradables/Easter_Glow.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-eclipse-uncommon','Eclipse','https://supremevalues.com/media/mm2uncommons/Eclipse.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eco-common','Eco','https://supremevalues.com/media/mm2commons/Eco.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ecto-common','Ecto','https://supremevalues.com/media/mm2commons/Ecto.webp','COMMON','2/10',2,25,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-egg-common','Egg','https://supremevalues.com/media/mm2commons/Egg.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-egg-toy-untradable','Egg Toy','https://supremevalues.com/media/mm2untradables/Egg_Toy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-egg-toy-24-untradable','Egg Toy ''24','https://supremevalues.com/media/mm2untradables/Egg_Toy_2024.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-egg-toy-25-untradable','Egg Toy ''25','https://supremevalues.com/media/mm2untradables/Egg_Toy_25.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-eggblade-godly','Eggblade','https://supremevalues.com/media/mm2godlies/Eggblade.webp','GODLY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-elderwood-untradable','Elderwood','https://supremevalues.com/media/mm2untradables/Elderwood.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-elderwood-blade-godly','Elderwood Blade','https://supremevalues.com/media/mm2godlies/Elderwood_Blade.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-elderwood-revolver-godly','Elderwood Revolver','https://supremevalues.com/media/mm2godlies/Elderwood_Revolver.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-elderwood-scythe-ancient','Elderwood Scythe','https://supremevalues.com/media/mm2ancients/Elderwood_Scythe.webp','ANCIENT','1/10',1,38,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-elderwood-set-set','Elderwood Set','https://supremevalues.com/media/mm2ancients/Elderwood_Scythe.webp','SET','1/10',1,71,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-electric-knife-untradable','Electric Knife','https://supremevalues.com/media/mm2untradables/Electric.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-electro-pet','Electro','https://supremevalues.com/media/mm2pets/Electro.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-pet','Elf','https://supremevalues.com/media/mm2pets/Elf.webp','PET','2/10',2,25,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-2017-common','Elf (2017)','https://supremevalues.com/media/mm2commons/Elf_2017.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-2018-common','Elf (2018)','https://supremevalues.com/media/mm2commons/Elf_Gun_2018.webp','COMMON','2/10',2,20,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-2019-pet','Elf (2019)','https://supremevalues.com/media/mm2pets/Elf_2019.webp','PET','4/10',4,625,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-2023-common','Elf (2023)','https://supremevalues.com/media/mm2commons/Elf_2023.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-gun-common','Elf (Gun)','https://supremevalues.com/media/mm2commons/Elf_Gun.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elf-knife-common','Elf (Knife)','https://supremevalues.com/media/mm2commons/Elf_Knife.webp','COMMON','2/10',2,15,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elite-legendary','Elite','https://supremevalues.com/media/mm2legendaries/Elite.webp','LEGENDARY','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eliteify-untradable','Eliteify','https://supremevalues.com/media/mm2untradables/Eliteify.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-elitey-pet','Elitey','https://supremevalues.com/media/mm2pets/Elitey.webp','PET','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-emerald-legendary','Emerald','https://supremevalues.com/media/mm2legendaries/Emerald.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-energized-gun-legendary','Energized (Gun)','https://supremevalues.com/media/mm2legendaries/Energized_Gun.webp','LEGENDARY','2/10',2,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-energized-knife-legendary','Energized (Knife)','https://supremevalues.com/media/mm2legendaries/Energized_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-engraved-common','Engraved','https://supremevalues.com/media/mm2commons/Engraved.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-etched-common','Etched','https://supremevalues.com/media/mm2commons/Etched.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-eternal-godly','Eternal','https://supremevalues.com/media/mm2godlies/Eternal.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eternal-ii-godly','Eternal II','https://supremevalues.com/media/mm2godlies/Eternal2.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eternal-iii-godly','Eternal III','https://supremevalues.com/media/mm2godlies/Eternal3.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eternal-iv-godly','Eternal IV','https://supremevalues.com/media/mm2godlies/Eternal4.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eternal-set-set','Eternal Set','https://supremevalues.com/media/mm2godlies/Eternal4.webp','SET','1/10',1,43,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-eternalcane-godly','Eternalcane','https://supremevalues.com/media/mm2godlies/Eternalcane.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eternalcane-set-set','Eternalcane Set','https://supremevalues.com/media/mm2godlies/Eternalcane.webp','SET','1/10',1,26,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-ethereal-untradable','Ethereal','https://supremevalues.com/media/mm2untradables/Ethereal.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-euro-common','Euro','https://supremevalues.com/media/mm2commons/Euro.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ever-set-set','Ever Set','https://supremevalues.com/media/mm2godlies/Evergun.webp','SET','6/10',6,6100,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-evergreen-godly','Evergreen','https://supremevalues.com/media/mm2godlies/Evergreen.webp','GODLY','6/10',6,2650,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-evergun-godly','Evergun','https://supremevalues.com/media/mm2godlies/Evergun.webp','GODLY','5/10',5,3450,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-eye-set-set','Eye Set','https://supremevalues.com/media/mm2pets/Overseer_Eye.webp','SET','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-eyeball-common','Eyeball','https://supremevalues.com/media/mm2commons/Eyeball.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-eyes-uncommon','Eyes','https://supremevalues.com/media/mm2uncommons/Eyes.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fade-legendary','Fade','https://supremevalues.com/media/mm2legendaries/Fade.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fairy-pet','Fairy','https://supremevalues.com/media/mm2pets/Fairy.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fake-gun-untradable','Fake Gun','https://supremevalues.com/media/mm2untradables/Fake_Gun.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-fall-common','Fall','https://supremevalues.com/media/mm2commons/Fall.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fall-camo-uncommon','Fall Camo','https://supremevalues.com/media/mm2uncommons/Fall_Camo.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fallout-common','Fallout','https://supremevalues.com/media/mm2commons/Fallout.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fang-godly','Fang','https://supremevalues.com/media/mm2godlies/Fang.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fire-bat-pet','Fire Bat','https://supremevalues.com/media/mm2pets/FBat.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-bear-pet','Fire Bear','https://supremevalues.com/media/mm2pets/FBear.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-bunny-pet','Fire Bunny','https://supremevalues.com/media/mm2pets/FBunny.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-cat-pet','Fire Cat','https://supremevalues.com/media/mm2pets/FCat.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-dog-pet','Fire Dog','https://supremevalues.com/media/mm2pets/FDog.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-fox-pet','Fire Fox','https://supremevalues.com/media/mm2pets/FFox.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fire-pig-pet','Fire Pig','https://supremevalues.com/media/mm2pets/FPig.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-firefly-jar-untradable','Firefly Jar','https://supremevalues.com/media/mm2untradables/Firefly_Jar.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-fireplace-uncommon','Fireplace','https://supremevalues.com/media/mm2uncommons/Fireplace.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fireworks-untradable','Fireworks','https://supremevalues.com/media/mm2untradables/Fireworks.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flames-godly','Flames','https://supremevalues.com/media/mm2godlies/Flames.webp','GODLY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-flaming-untradable','Flaming','https://supremevalues.com/media/mm2untradables/Flaming.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flaming-knife-untradable','Flaming Knife','https://supremevalues.com/media/mm2untradables/Flaming_Knife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flamingo-untradable','Flamingo','https://supremevalues.com/media/mm2untradables/Flamingo.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flamingo-toy-untradable','Flamingo (Toy)','https://supremevalues.com/media/mm2untradables/Flamingo_Emote.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-floatie-uncommon','Floatie','https://supremevalues.com/media/mm2uncommons/Floatie.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-flora-godly','Flora','https://supremevalues.com/media/mm2godlies/Flora.webp','GODLY','5/10',5,410,null,'2026-08-24T20:26:24.967Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-floral-uncommon','Floral','https://supremevalues.com/media/mm2uncommons/Floral.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-floral-gun-rare','Floral (Gun)','https://supremevalues.com/media/mm2rares/Floral_Gun.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-floral-knife-rare','Floral (Knife)','https://supremevalues.com/media/mm2rares/Floral.webp','RARE','2/10',2,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-floss-untradable','Floss','https://supremevalues.com/media/mm2untradables/Floss.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flow-untradable','Flow','https://supremevalues.com/media/mm2untradables/Flow.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flowers-untradable','Flowers','https://supremevalues.com/media/mm2untradables/Flower.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-flowerwood-godly','Flowerwood','https://supremevalues.com/media/mm2godlies/Flowerwood.webp','GODLY','4/10',4,260,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-flowerwood-gun-godly','Flowerwood Gun','https://supremevalues.com/media/mm2godlies/Flowerwood_Gun.webp','GODLY','4/10',4,265,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-flowerwood-set-set','Flowerwood Set','https://supremevalues.com/media/mm2godlies/Flowerwood.webp','SET','4/10',4,525,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-footsteps-untradable','Footsteps','https://supremevalues.com/media/mm2untradables/Footsteps.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-forest-uncommon','Forest','https://supremevalues.com/media/mm2uncommons/Forest.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-fox-pet','Fox','https://supremevalues.com/media/mm2pets/Fox.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fragile-gun-common','Fragile (Gun)','https://supremevalues.com/media/mm2commons/Fragile_Gun.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-fragile-knife-common','Fragile (Knife)','https://supremevalues.com/media/mm2commons/Fragile_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-frost-untradable','Frost','https://supremevalues.com/media/mm2untradables/Frost.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-frostbird-pet','Frostbird','https://supremevalues.com/media/mm2pets/Frostbird.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-frostbite-godly','Frostbite','https://supremevalues.com/media/mm2godlies/Frostbite.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frosted-gun-common','Frosted (Gun)','https://supremevalues.com/media/mm2commons/Frosted_Gun.webp','COMMON','2/10',2,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-frosted-knife-common','Frosted (Knife)','https://supremevalues.com/media/mm2commons/Frosted_Knife.webp','COMMON','2/10',2,30,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-frostfade-gun-legendary','Frostfade (Gun)','https://supremevalues.com/media/mm2legendaries/Frostfade_Gun.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frostfade-knife-legendary','Frostfade (Knife)','https://supremevalues.com/media/mm2legendaries/Frostfade_Knife.webp','LEGENDARY','2/10',2,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frostfire-untradable','Frostfire','https://supremevalues.com/media/mm2untradables/Frostfire.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-frostflame-gun-rare','Frostflame (Gun)','https://supremevalues.com/media/mm2rares/Frostflame_Gun.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frostflame-knife-rare','Frostflame (Knife)','https://supremevalues.com/media/mm2rares/Frostflame_Knife.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frostsaber-godly','Frostsaber','https://supremevalues.com/media/mm2godlies/Frostsaber.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frosty-uncommon','Frosty','https://supremevalues.com/media/mm2uncommons/Frosty.webp','UNCOMMON','1/10',1,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frozen-gun-legendary','Frozen (Gun)','https://supremevalues.com/media/mm2legendaries/Frozen_Gun.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frozen-knife-legendary','Frozen (Knife)','https://supremevalues.com/media/mm2legendaries/Frozen_Knife.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-frozen-set-set','Frozen Set','https://supremevalues.com/media/mm2uncommons/Frozen_Gun.webp','SET','1/10',1,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-bringer-set-set','Full Bringer Set','https://supremevalues.com/media/mm2godlies/Lightbringer.webp','SET','1/10',1,191,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-chroma-set-set','Full Chroma Set','https://supremevalues.com/media/mm2chromas/CDB.webp','SET','1/10',1,555,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-colored-seer-set-set','Full Colored Seer Set','https://supremevalues.com/media/mm2chromas/CSeer.webp','SET','1/10',1,44,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-elderwood-set-set','Full Elderwood Set','https://supremevalues.com/media/mm2godlies/Elderwood_Blade.webp','SET','1/10',1,104,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-elite-set-set','Full Elite Set','https://supremevalues.com/media/mm2legendaries/Elite.webp','SET','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-ice-set-set','Full Ice Set','https://supremevalues.com/media/mm2ancients/Icepiercer.webp','SET','3/10',3,258,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-luger-set-set','Full Luger Set','https://supremevalues.com/media/mm2chromas/CLuger.webp','SET','1/10',1,170,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-full-swirly-set-set','Full Swirly Set','https://supremevalues.com/media/mm2godlies/Swirly_Blade.webp','SET','1/10',1,68,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-fusion-legendary','Fusion','https://supremevalues.com/media/mm2legendaries/Fusion.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-future-uncommon','Future','https://supremevalues.com/media/mm2uncommons/Future.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-galactic-rare','Galactic','https://supremevalues.com/media/mm2rares/Galactic.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-galaxy-rare','Galaxy','https://supremevalues.com/media/mm2rares/Galaxy.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gearstorm-untradable','Gearstorm','https://supremevalues.com/media/mm2untradables/Gearstorm.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-gemstone-godly','Gemstone','https://supremevalues.com/media/mm2godlies/Gemstone.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gg-sign-untradable','GG Sign','https://supremevalues.com/media/mm2untradables/GG_Sign.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ghastly-gun-rare','Ghastly (Gun)','https://supremevalues.com/media/mm2rares/Ghastly_Gun.webp','RARE','2/10',2,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghastly-knife-rare','Ghastly (Knife)','https://supremevalues.com/media/mm2rares/Ghastly_Knife.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghost-vintage','Ghost','https://supremevalues.com/media/mm2vintages/Ghost.webp','VINTAGE','1/10',1,8,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-ghost-gun-legendary','Ghost (Gun)','https://supremevalues.com/media/mm2legendaries/Ghost_Gun.webp','LEGENDARY','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghost-knife-legendary','Ghost (Knife)','https://supremevalues.com/media/mm2legendaries/Ghost_Knife.webp','LEGENDARY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghost-set-set','Ghost Set','https://supremevalues.com/media/mm2legendaries/Ghost_Knife.webp','SET','1/10',1,7,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-ghostblade-godly','Ghostblade','https://supremevalues.com/media/mm2godlies/Ghostblade.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghostfire-rare','Ghostfire','https://supremevalues.com/media/mm2rares/Ghostfire.webp','RARE','2/10',2,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghostify-untradable','Ghostify','https://supremevalues.com/media/mm2untradables/Ghostify.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ghostly-uncommon','Ghostly','https://supremevalues.com/media/mm2uncommons/Ghostly.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghosts-untradable','Ghosts','https://supremevalues.com/media/mm2untradables/Ghosts.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ghosts-2023-common','Ghosts (2023)','https://supremevalues.com/media/mm2commons/Ghosts.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ghosts-2024-common','Ghosts (2024)','https://supremevalues.com/media/mm2commons/Ghosts_2024.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ghosts-gun-rare','Ghosts (Gun)','https://supremevalues.com/media/mm2rares/Ghosts_Gun.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghosts-knife-uncommon','Ghosts (Knife)','https://supremevalues.com/media/mm2uncommons/Ghosts_Knife.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ghosty-common','Ghosty','https://supremevalues.com/media/mm2commons/Ghosty.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ghoulish-common','Ghoulish','https://supremevalues.com/media/mm2commons/Ghoulish.webp','COMMON','3/10',3,95,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gift-bag-gun-common','Gift Bag (Gun)','https://supremevalues.com/media/mm2commons/Gift_Bag_Gun.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gift-bag-knife-common','Gift Bag (Knife)','https://supremevalues.com/media/mm2commons/Gift_Bag_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gifted-uncommon','Gifted','https://supremevalues.com/media/mm2uncommons/Gifted.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gifts-untradable','Gifts','https://supremevalues.com/media/mm2untradables/Gifts.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-gifts-2024-common','Gifts (2024)','https://supremevalues.com/media/mm2commons/Gifts_2024.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gifts-gun-common','Gifts (Gun)','https://supremevalues.com/media/mm2commons/Gifts_Gun.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gifts-knife-common','Gifts (Knife)','https://supremevalues.com/media/mm2commons/Gifts_Knife.webp','COMMON','3/10',3,95,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gifts-2015-misc','Gifts 2015','https://supremevalues.com/media/mm2misc/Xmas_Gifts.webp','MISC','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-giftwrap-common','Giftwrap','https://supremevalues.com/media/mm2commons/GiftWrap.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ginger-gun-legendary','Ginger (Gun)','https://supremevalues.com/media/mm2legendaries/Ginger_Gun.webp','LEGENDARY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ginger-knife-legendary','Ginger (Knife)','https://supremevalues.com/media/mm2legendaries/Ginger_Knife.webp','LEGENDARY','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ginger-luger-godly','Ginger Luger','https://supremevalues.com/media/mm2godlies/Ginger_Luger.webp','GODLY','1/10',1,17,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ginger-set-godly-set','Ginger Set (Godly)','https://supremevalues.com/media/mm2godlies/Gingerblade.webp','SET','1/10',1,30,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gingerblade-godly','Gingerblade','https://supremevalues.com/media/mm2godlies/Gingerblade.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerbread-rare','Gingerbread','https://supremevalues.com/media/mm2rares/Gingerbread.webp','RARE','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerbread-gun-rare','Gingerbread (Gun)','https://supremevalues.com/media/mm2rares/Gingerbread_Gun.webp','RARE','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerbread-knife-rare','Gingerbread (Knife)','https://supremevalues.com/media/mm2rares/Gingerbread_Knife.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerbread-effect-untradable','Gingerbread Effect','https://supremevalues.com/media/mm2untradables/Gingerbread.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-gingercookie-gun-rare','Gingercookie (Gun)','https://supremevalues.com/media/mm2rares/Gingercookie_Gun.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingercookie-knife-rare','Gingercookie (Knife)','https://supremevalues.com/media/mm2rares/Gingercookie_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerheart-uncommon','Gingerheart','https://supremevalues.com/media/mm2uncommons/Gingerheart.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingermint-godly','Gingermint','https://supremevalues.com/media/mm2godlies/Gingermint.webp','GODLY','1/10',1,12,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gingerscope-ancient','Gingerscope','https://supremevalues.com/media/mm2ancients/Gingerscope.webp','ANCIENT','6/10',6,17750,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gingerscythe-var-1-evo','Gingerscythe (Var. 1)','https://supremevalues.com/media/mm2evos/GingerScytheV1.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gingerscythe-var-2-evo','Gingerscythe (Var. 2)','https://supremevalues.com/media/mm2evos/GingerScytheV2.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gingerscythe-var-3-evo','Gingerscythe (Var. 3)','https://supremevalues.com/media/mm2evos/GingerScytheV3.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gingerscythe-var-4-evo','Gingerscythe (Var. 4)','https://supremevalues.com/media/mm2evos/GingerScytheV4.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-glisten-untradable','Glisten','https://supremevalues.com/media/mm2untradables/Glisten.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-glitch1-common','Glitch1','https://supremevalues.com/media/mm2commons/Glitch1.webp','COMMON','2/10',2,70,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-glitch2-common','Glitch2','https://supremevalues.com/media/mm2commons/Glitch2.webp','COMMON','2/10',2,35,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-glowy-uncommon','Glowy','https://supremevalues.com/media/mm2uncommons/GlowyKnife.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gold-papers-misc','Gold Papers','https://supremevalues.com/media/mm2misc/Gold_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-golden-vintage','Golden','https://supremevalues.com/media/mm2vintages/Golden.webp','VINTAGE','1/10',1,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-goo-common','Goo','https://supremevalues.com/media/mm2commons/Goo.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-gothic-gun-uncommon','Gothic (Gun)','https://supremevalues.com/media/mm2uncommons/Gothic_Gun.webp','UNCOMMON','2/10',2,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-gothic-knife-uncommon','Gothic (Knife)','https://supremevalues.com/media/mm2uncommons/Gothic_Knife.webp','UNCOMMON','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-graffiti-uncommon','Graffiti','https://supremevalues.com/media/mm2uncommons/Graffiti.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-grave-gun-common','Grave (Gun)','https://supremevalues.com/media/mm2commons/Grave_Gun.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-grave-knife-common','Grave (Knife)','https://supremevalues.com/media/mm2commons/Grave_Knife.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-grave-set-set','Grave Set','https://supremevalues.com/media/mm2commons/Grave_Gun.webp','SET','1/10',1,2,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-gravestone-untradable','Gravestone','https://supremevalues.com/media/mm2untradables/Gravestone.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-green-common','Green','https://supremevalues.com/media/mm2commons/Green.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-green-candy-cane-untradable','Green Candy Cane','https://supremevalues.com/media/mm2untradables/Green_Candy_Cane.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-green-elite-legendary','Green Elite','https://supremevalues.com/media/mm2legendaries/Green_Elite.webp','LEGENDARY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-green-fire-legendary','Green Fire','https://supremevalues.com/media/mm2legendaries/Green_Fire.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-green-flaming-knife-untradable','Green Flaming Knife','https://supremevalues.com/media/mm2untradables/Green_Flaming_Knife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-green-luger-godly','Green Luger','https://supremevalues.com/media/mm2godlies/Green_Luger.webp','GODLY','1/10',1,23,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-green-marble-rare','Green Marble','https://supremevalues.com/media/mm2rares/Green_Marble.webp','RARE','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-green-papers-misc','Green Papers','https://supremevalues.com/media/mm2misc/Green_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-green-sparkletime-untradable','Green Sparkletime','https://supremevalues.com/media/mm2untradables/Green_Sparkletime.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-grind-common','Grind','https://supremevalues.com/media/mm2commons/Grind.webp','COMMON','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-hacker-rare','Hacker','https://supremevalues.com/media/mm2rares/Hacker.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hallow-set-set','Hallow Set','https://supremevalues.com/media/mm2ancients/Hallowscythe.webp','SET','1/10',1,50,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-hallows-blade-godly','Hallow''s Blade','https://supremevalues.com/media/mm2godlies/Hallows_Blade.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hallows-blaze-untradable','Hallow''s Blaze','https://supremevalues.com/media/mm2untradables/Hallows_Blaze.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-hallows-edge-godly','Hallow''s Edge','https://supremevalues.com/media/mm2godlies/Hallows_Edge.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hallowgun-godly','Hallowgun','https://supremevalues.com/media/mm2godlies/Hallowgun.webp','GODLY','1/10',1,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hallowradio-untradable','Hallowradio','https://supremevalues.com/media/mm2untradables/Hallowradio.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-hallowscythe-ancient','Hallowscythe','https://supremevalues.com/media/mm2ancients/Hallowscythe.webp','ANCIENT','1/10',1,30,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-handsaw-godly','Handsaw','https://supremevalues.com/media/mm2godlies/Handsaw.webp','GODLY','1/10',1,8,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hardened-common','Hardened','https://supremevalues.com/media/mm2commons/Hardened.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-harvester-ancient','Harvester','https://supremevalues.com/media/mm2ancients/Harvester.webp','ANCIENT','3/10',3,250,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-haste-untradable','Haste','https://supremevalues.com/media/mm2untradables/Haste.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-haunted-common','Haunted','https://supremevalues.com/media/mm2commons/Haunted_2021.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-haunted-2025-common','Haunted (2025)','https://supremevalues.com/media/mm2commons/Haunted_2025.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-haunted-gun-common','Haunted (Gun)','https://supremevalues.com/media/mm2commons/Haunted_Gun.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-haunted-knife-common','Haunted (Knife)','https://supremevalues.com/media/mm2commons/Haunted_Knife.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-haunted-set-set','Haunted Set','https://supremevalues.com/media/mm2commons/Haunted_Knife.webp','SET','1/10',1,2,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-hazard-gun-uncommon','Hazard (Gun)','https://supremevalues.com/media/mm2uncommons/Hazard_Gun.webp','UNCOMMON','2/10',2,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hazard-knife-uncommon','Hazard (Knife)','https://supremevalues.com/media/mm2uncommons/Hazard_Knife.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hazmat-uncommon','Hazmat','https://supremevalues.com/media/mm2uncommons/Hazmat.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-headless-untradable','Headless','https://supremevalues.com/media/mm2untradables/Headless.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-heart-rare','Heart','https://supremevalues.com/media/mm2rares/Heart.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-heart-wand-godly','Heart Wand','https://supremevalues.com/media/mm2godlies/Heart_Wand.webp','GODLY','4/10',4,340,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-heartblade-godly','Heartblade','https://supremevalues.com/media/mm2godlies/Heartblade.webp','GODLY','1/10',1,65,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-heartbreak-rare','Heartbreak','https://supremevalues.com/media/mm2rares/Heartbreak.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-heartify-untradable','Heartify','https://supremevalues.com/media/mm2untradables/Heartify.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-hearts-common','Hearts','https://supremevalues.com/media/mm2commons/Hearts.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-hearts-2026-common','Hearts (2026)','https://supremevalues.com/media/mm2commons/Hearts_2026.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-heat-godly','Heat','https://supremevalues.com/media/mm2godlies/Heat.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-heatwave-untradable','Heatwave','https://supremevalues.com/media/mm2untradables/Heatwaves.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-high-tech-uncommon','High Tech','https://supremevalues.com/media/mm2uncommons/High_Tech.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hive-uncommon','Hive','https://supremevalues.com/media/mm2uncommons/Hive.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hl2-common','HL2','https://supremevalues.com/media/mm2commons/HL2.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-holly-gun-uncommon','Holly (Gun)','https://supremevalues.com/media/mm2uncommons/Holly_Gun.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-holly-knife-uncommon','Holly (Knife)','https://supremevalues.com/media/mm2uncommons/Holly_Knife.webp','UNCOMMON','1/10',1,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hologram-gun-rare','Hologram (Gun)','https://supremevalues.com/media/mm2rares/Hologram_Gun.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hologram-knife-rare','Hologram (Knife)','https://supremevalues.com/media/mm2rares/Hologram_Knife.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-hot-chocolate-common','Hot Chocolate','https://supremevalues.com/media/mm2commons/Hot_Chocolate.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-hunter-common','Hunter','https://supremevalues.com/media/mm2commons/Hunter.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ice-common','Ice','https://supremevalues.com/media/mm2commons/Ice.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ice-camo-rare','Ice Camo','https://supremevalues.com/media/mm2rares/Ice_Camo.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ice-cream-untradable','Ice Cream','https://supremevalues.com/media/mm2untradables/Ice_Cream.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ice-cream-2025-untradable','Ice Cream (2025)','https://supremevalues.com/media/mm2untradables/Ice_Cream_2025.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ice-dragon-godly','Ice Dragon','https://supremevalues.com/media/mm2godlies/Ice_Dragon.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ice-magic-untradable','Ice Magic','https://supremevalues.com/media/mm2untradables/Ice_Magic.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ice-phoenix-pet','Ice Phoenix','https://supremevalues.com/media/mm2pets/Ice_Phoenix.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ice-set-set','Ice Set','https://supremevalues.com/media/mm2ancients/Icebreaker.webp','SET','1/10',1,98,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-ice-shard-godly','Ice Shard','https://supremevalues.com/media/mm2godlies/Ice_Shard.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icebeam-godly','Icebeam','https://supremevalues.com/media/mm2godlies/Icebeam.webp','GODLY','1/10',1,18,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-iceblaster-godly','Iceblaster','https://supremevalues.com/media/mm2godlies/Iceblaster.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icebreaker-ancient','Icebreaker','https://supremevalues.com/media/mm2ancients/Icebreaker.webp','ANCIENT','1/10',1,65,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icecracker-legendary','Icecracker','https://supremevalues.com/media/mm2legendaries/Icecracker.webp','LEGENDARY','2/10',2,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icecream-godly','Icecream','https://supremevalues.com/media/mm2godlies/Icecream.webp','GODLY','2/10',2,105,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icecrusher-variant-1-evo','Icecrusher (Variant 1)','https://supremevalues.com/media/mm2evos/IcecrusherV1.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icecrusher-variant-2-evo','Icecrusher (Variant 2)','https://supremevalues.com/media/mm2evos/IcecrusherV2.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icecrusher-variant-3-evo','Icecrusher (Variant 3)','https://supremevalues.com/media/mm2evos/IcecrusherV3.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icecrusher-variant-4-evo','Icecrusher (Variant 4)','https://supremevalues.com/media/mm2evos/IcecrusherV4.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icedriller-legendary','Icedriller','https://supremevalues.com/media/mm2legendaries/Icedriller.webp','LEGENDARY','2/10',2,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icedriller-set-set','Icedriller Set','https://supremevalues.com/media/mm2legendaries/Icedriller.webp','SET','2/10',2,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-iceflake-godly','Iceflake','https://supremevalues.com/media/mm2godlies/Iceflake.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-iceflake-set-set','Iceflake Set','https://supremevalues.com/media/mm2godlies/Iceflake.webp','SET','1/10',1,33,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icepiercer-ancient','Icepiercer','https://supremevalues.com/media/mm2ancients/Icepiercer.webp','ANCIENT','3/10',3,160,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-iceplayer-untradable','Iceplayer','https://supremevalues.com/media/mm2untradables/Iceplayer.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-icewing-ancient','Icewing','https://supremevalues.com/media/mm2ancients/Icewing.webp','ANCIENT','1/10',1,13,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-icey-pet','Icey','https://supremevalues.com/media/mm2pets/Icey.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-icicles-gun-rare','Icicles (Gun)','https://supremevalues.com/media/mm2rares/Icicles_Gun.webp','RARE','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-icicles-knife-rare','Icicles (Knife)','https://supremevalues.com/media/mm2rares/Icicles_Knife.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-igloo-gun-common','Igloo (Gun)','https://supremevalues.com/media/mm2commons/Igloo_Gun.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-igloo-knife-common','Igloo (Knife)','https://supremevalues.com/media/mm2commons/Igloo.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-imbued-rare','Imbued','https://supremevalues.com/media/mm2rares/Imbued.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-indy-common','Indy','https://supremevalues.com/media/mm2commons/Indy.webp','COMMON','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-infected-common','Infected','https://supremevalues.com/media/mm2commons/Infected.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-infected-gun-common','Infected (Gun)','https://supremevalues.com/media/mm2commons/Infected_Gun.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-infected-knife-common','Infected (Knife)','https://supremevalues.com/media/mm2commons/Infected_Knife.webp','COMMON','2/10',2,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-infiltrator-common','Infiltrator','https://supremevalues.com/media/mm2commons/Infiltrator.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-irevolver-rare','iRevolver','https://supremevalues.com/media/mm2rares/iRevolver.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-iron-common','Iron','https://supremevalues.com/media/mm2commons/Iron.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-jack-rare','Jack','https://supremevalues.com/media/mm2rares/Jack.webp','RARE','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-jack-o-radio-untradable','Jack-o-Radio','https://supremevalues.com/media/mm2untradables/Jack_O_Radio.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-jd-legendary','JD','https://supremevalues.com/media/mm2legendaries/JD.webp','LEGENDARY','2/10',2,28,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-jellyfish-uncommon','Jellyfish','https://supremevalues.com/media/mm2uncommons/Jellyfish.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-jetstream-pet','Jetstream','https://supremevalues.com/media/mm2pets/Jetstream.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-jigsaw-uncommon','Jigsaw','https://supremevalues.com/media/mm2uncommons/Jigsaw.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-jingle-untradable','Jingle','https://supremevalues.com/media/mm2untradables/Jingle.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-jinglegun-godly','Jinglegun','https://supremevalues.com/media/mm2godlies/Jinglegun.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-juice-common','Juice','https://supremevalues.com/media/mm2commons/Juice.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-key-toy-untradable','Key Toy','https://supremevalues.com/media/mm2untradables/Key_Toy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-knife-wrapper-untradable','Knife Wrapper','https://supremevalues.com/media/mm2untradables/Knife_Wrapper.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-knifeception-untradable','Knifeception','https://supremevalues.com/media/mm2untradables/Knifeception.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-korblox-rare','Korblox','https://supremevalues.com/media/mm2rares/Korblox.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-kraken-rare','Kraken','https://supremevalues.com/media/mm2rares/Kraken.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-krypto-rare','Krypto','https://supremevalues.com/media/mm2rares/Krypto.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-lantern-uncommon','Lantern','https://supremevalues.com/media/mm2uncommons/Lantern.webp','UNCOMMON','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-laser-godly','Laser','https://supremevalues.com/media/mm2godlies/Laser.webp','GODLY','1/10',1,22,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-latte-untradable','Latte','https://supremevalues.com/media/mm2untradables/Latte.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-latte-gun-legendary','Latte (Gun)','https://supremevalues.com/media/mm2legendaries/Latte_Gun.webp','LEGENDARY','3/10',3,140,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-latte-knife-legendary','Latte (Knife)','https://supremevalues.com/media/mm2legendaries/Latte_Knife.webp','LEGENDARY','3/10',3,140,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-latte-set-set','Latte Set','https://supremevalues.com/media/mm2legendaries/Latte_Knife.webp','SET','3/10',3,280,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-lava-gun-uncommon','Lava (Gun)','https://supremevalues.com/media/mm2uncommons/Lava.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-lava-knife-uncommon','Lava (Knife)','https://supremevalues.com/media/mm2uncommons/Lava_Knife.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-leaf-common','Leaf','https://supremevalues.com/media/mm2commons/Leaf.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-leaves-uncommon','Leaves','https://supremevalues.com/media/mm2uncommons/Leaves.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-legendary-ornament-untradable','Legendary Ornament','https://supremevalues.com/media/mm2untradables/Legendary_Ornament.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-lightbringer-godly','Lightbringer','https://supremevalues.com/media/mm2godlies/Lightbringer.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-lights-untradable','Lights','https://supremevalues.com/media/mm2untradables/Lights.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-lights-gun-uncommon','Lights (Gun)','https://supremevalues.com/media/mm2uncommons/Lights_Gun.webp','UNCOMMON','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-lights-knife-uncommon','Lights (Knife)','https://supremevalues.com/media/mm2uncommons/Lights_Knife.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-lights-set-set','Lights Set','https://supremevalues.com/media/mm2uncommons/Lights_Gun.webp','SET','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-lil-alien-pet','Lil'' Alien','https://supremevalues.com/media/mm2pets/Lil_Alien.webp','PET','2/10',2,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-linked-common','Linked','https://supremevalues.com/media/mm2commons/Linked.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-log-common','Log','https://supremevalues.com/media/mm2commons/Log.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-logchopper-ancient','Logchopper','https://supremevalues.com/media/mm2ancients/Logchopper.webp','ANCIENT','1/10',1,18,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-logchopper-set-set','Logchopper Set','https://supremevalues.com/media/mm2ancients/Logchopper.webp','SET','1/10',1,31,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-logcutter-rare','Logcutter','https://supremevalues.com/media/mm2rares/Logcutter.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-love-2023-common','Love (2023)','https://supremevalues.com/media/mm2commons/Love_2023.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-love-gun-uncommon','Love (Gun)','https://supremevalues.com/media/mm2uncommons/Love_Gun.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-love-knife-common','Love (Knife)','https://supremevalues.com/media/mm2commons/Love.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-lovely-common','Lovely','https://supremevalues.com/media/mm2commons/Lovely.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-lucky-uncommon','Lucky','https://supremevalues.com/media/mm2uncommons/Lucky.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-luger-godly','Luger','https://supremevalues.com/media/mm2godlies/Luger.webp','GODLY','1/10',1,30,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-luger-set-set','Luger Set','https://supremevalues.com/media/mm2godlies/Luger.webp','SET','1/10',1,120,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-lugercane-godly','Lugercane','https://supremevalues.com/media/mm2godlies/Lugercane.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-magma-rare','Magma','https://supremevalues.com/media/mm2rares/Magma.webp','RARE','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-magma-gun-rare','Magma (Gun)','https://supremevalues.com/media/mm2rares/Magma_Gun.webp','RARE','2/10',2,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-magma-knife-rare','Magma (Knife)','https://supremevalues.com/media/mm2rares/Magma_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-makeshift-godly','Makeshift','https://supremevalues.com/media/mm2godlies/Makeshift.webp','GODLY','1/10',1,33,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-makeshift-knife-rare','Makeshift (Knife)','https://supremevalues.com/media/mm2rares/Makeshift.webp','RARE','2/10',2,35,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-marble-uncommon','Marble','https://supremevalues.com/media/mm2uncommons/Marble.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-marble-set-set','Marble Set','https://supremevalues.com/media/mm2rares/Orangle_Marble.webp','SET','1/10',1,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-marina-uncommon','Marina','https://supremevalues.com/media/mm2uncommons/Marina.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-matrix-untradable','Matrix','https://supremevalues.com/media/mm2untradables/Matrix.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-meadow-uncommon','Meadow','https://supremevalues.com/media/mm2uncommons/Meadow.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mechbug-pet','Mechbug','https://supremevalues.com/media/mm2pets/Mechbug.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-melon-uncommon','Melon','https://supremevalues.com/media/mm2uncommons/Melon_2023.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-meltdown-uncommon','Meltdown','https://supremevalues.com/media/mm2uncommons/Meltdown_Knife.webp','UNCOMMON','2/10',2,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-midnight-legendary','Midnight','https://supremevalues.com/media/mm2legendaries/Midnight.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-minty-godly','Minty','https://supremevalues.com/media/mm2godlies/Minty.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-missing-uncommon','Missing','https://supremevalues.com/media/mm2uncommons/Missing.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mistletoe-gun-uncommon','Mistletoe (Gun)','https://supremevalues.com/media/mm2uncommons/Mistletoe_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mistletoe-knife-uncommon','Mistletoe (Knife)','https://supremevalues.com/media/mm2uncommons/Mistletoe_Knife.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-molten-gun-rare','Molten (Gun)','https://supremevalues.com/media/mm2rares/Molten_Gun.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-molten-knife-rare','Molten (Knife)','https://supremevalues.com/media/mm2rares/Molten_Knife.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-monify-untradable','Monify','https://supremevalues.com/media/mm2untradables/Monify.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-monster-rare','Monster','https://supremevalues.com/media/mm2rares/Monster.webp','RARE','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-moon-common','Moon','https://supremevalues.com/media/mm2commons/Moon.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-moonlight-uncommon','Moonlight','https://supremevalues.com/media/mm2uncommons/Moonlight.webp','UNCOMMON','2/10',2,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-moons-uncommon','Moons','https://supremevalues.com/media/mm2uncommons/Moons.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-moons-2024-uncommon','Moons (2024)','https://supremevalues.com/media/mm2uncommons/Moons_2024.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mr-reindeer-pet','Mr. Reindeer','https://supremevalues.com/media/mm2pets/Mr_Reindeer.webp','PET','3/10',3,55,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-mr-snowman-pet','Mr. Snowman','https://supremevalues.com/media/mm2pets/Mr_Snowman.webp','PET','2/10',2,20,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-mummified-common','Mummified','https://supremevalues.com/media/mm2commons/Mummified.webp','COMMON','2/10',2,35,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-mummy-rare','Mummy','https://supremevalues.com/media/mm2rares/Mummy.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mummy-2017-uncommon','Mummy (2017)','https://supremevalues.com/media/mm2uncommons/Mummy.webp','UNCOMMON','2/10',2,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mummy-set-set','Mummy Set','https://supremevalues.com/media/mm2uncommons/Mummy_Gun_2018.webp','SET','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-musical-rare','Musical','https://supremevalues.com/media/mm2rares/Musical.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-mystery-key-misc','Mystery Key','https://supremevalues.com/media/mm2misc/Mystery_Key.webp','MISC','2/10',2,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-nebula-godly','Nebula','https://supremevalues.com/media/mm2godlies/Nebula.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-neon-common','Neon','https://supremevalues.com/media/mm2commons/Neon.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-neopolitan-uncommon','Neopolitan','https://supremevalues.com/media/mm2uncommons/Neopolitan.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nether-rare','Nether','https://supremevalues.com/media/mm2rares/Nether.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-news-common','News','https://supremevalues.com/media/mm2commons/News.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-night-uncommon','Night','https://supremevalues.com/media/mm2uncommons/Night.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nightblade-godly','Nightblade','https://supremevalues.com/media/mm2godlies/Nightblade.webp','GODLY','1/10',1,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nightfire-rare','Nightfire','https://supremevalues.com/media/mm2rares/Nightfire.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nightlife-untradable','Nightlife','https://supremevalues.com/media/mm2untradables/Nightlife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-nightsky-legendary','Nightsky','https://supremevalues.com/media/mm2legendaries/Nightsky.webp','LEGENDARY','2/10',2,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nightstar-legendary','Nightstar','https://supremevalues.com/media/mm2legendaries/Nightstar.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ninja-untradable','Ninja','https://supremevalues.com/media/mm2untradables/Ninja.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ninja-rest-untradable','Ninja Rest','https://supremevalues.com/media/mm2untradables/Ninja_Rest.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-nobledragon-pet','Nobledragon','https://supremevalues.com/media/mm2pets/Nobledragon.webp','PET','1/10',1,5,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-northern-lights-untradable','Northern Lights','https://supremevalues.com/media/mm2untradables/Northern_Lights.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-nova-rare','Nova','https://supremevalues.com/media/mm2rares/Nova.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nuke-rare','Nuke','https://supremevalues.com/media/mm2rares/Nuclear.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-nutcracker-uncommon','Nutcracker','https://supremevalues.com/media/mm2uncommons/Nutcracker.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ocean-godly','Ocean','https://supremevalues.com/media/mm2godlies/Ocean.webp','GODLY','4/10',4,285,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ocean-set-set','Ocean Set','https://supremevalues.com/media/mm2godlies/Waves.webp','SET','4/10',4,565,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-oily-common','Oily','https://supremevalues.com/media/mm2commons/Oily.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-old-glory-godly','Old Glory','https://supremevalues.com/media/mm2godlies/Old_Glory.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-old-glory-set-set','Old Glory Set','https://supremevalues.com/media/mm2godlies/Old_Glory.webp','SET','1/10',1,37,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-ollie-common','Ollie','https://supremevalues.com/media/mm2commons/Ollie.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-omega-untradable','Omega','https://supremevalues.com/media/mm2untradables/Omega.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-orange-common','Orange','https://supremevalues.com/media/mm2commons/Orange.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-orange-marble-rare','Orange Marble','https://supremevalues.com/media/mm2rares/Orangle_Marble.webp','RARE','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-orange-seer-godly','Orange Seer','https://supremevalues.com/media/mm2godlies/Orange_Seer.webp','GODLY','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ornament-godly','Ornament','https://supremevalues.com/media/mm2godlies/Ornament.webp','GODLY','2/10',2,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ornament1-common','Ornament1','https://supremevalues.com/media/mm2commons/Ornament1.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ornament2-gun-common','Ornament2 (Gun)','https://supremevalues.com/media/mm2commons/Ornament2_Gun.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ornament2-knife-common','Ornament2 (Knife)','https://supremevalues.com/media/mm2commons/Ornament2_Knife.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ornaments-uncommon','Ornaments','https://supremevalues.com/media/mm2uncommons/Ornaments.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ornaments-gun-common','Ornaments (Gun)','https://supremevalues.com/media/mm2commons/Ornaments_Gun.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ornaments-knife-common','Ornaments (Knife)','https://supremevalues.com/media/mm2commons/Ornaments_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-overseer-untradable','Overseer','https://supremevalues.com/media/mm2untradables/Overseer.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-overseer-gun-legendary','Overseer (Gun)','https://supremevalues.com/media/mm2legendaries/Overseer_Gun.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-overseer-knife-legendary','Overseer (Knife)','https://supremevalues.com/media/mm2legendaries/Overseer_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-overseer-eye-pet','Overseer Eye','https://supremevalues.com/media/mm2pets/Overseer_Eye.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-painted-gun-uncommon','Painted (Gun)','https://supremevalues.com/media/mm2uncommons/Painted_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-painted-knife-rare','Painted (Knife)','https://supremevalues.com/media/mm2rares/Painted_Knife.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-palms-gun-legendary','Palms (Gun)','https://supremevalues.com/media/mm2legendaries/Palms_Gun.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-palms-knife-legendary','Palms (Knife)','https://supremevalues.com/media/mm2legendaries/Palms_Knife.webp','LEGENDARY','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pals-set-set','Pals Set','https://supremevalues.com/media/mm2commons/Denis.webp','SET','2/10',2,20,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-paper-uncommon','Paper','https://supremevalues.com/media/mm2uncommons/Paper.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-passion-common','Passion','https://supremevalues.com/media/mm2commons/Passion.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-patrick-common','Patrick','https://supremevalues.com/media/mm2commons/Patrick.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-paws-uncommon','Paws','https://supremevalues.com/media/mm2uncommons/Paws.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pea-common','Pea','https://supremevalues.com/media/mm2commons/Pea.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pearl-godly','Pearl','https://supremevalues.com/media/mm2godlies/Pearl.webp','GODLY','1/10',1,80,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pearl-set-set','Pearl Set','https://supremevalues.com/media/mm2godlies/Pearl.webp','SET','1/10',1,165,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-pearlshine-godly','Pearlshine','https://supremevalues.com/media/mm2godlies/Pearlshine.webp','GODLY','1/10',1,85,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-penguin-common','Penguin','https://supremevalues.com/media/mm2commons/Penguin.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pengy-pet','Pengy','https://supremevalues.com/media/mm2pets/Pengy.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-peppermint-godly','Peppermint','https://supremevalues.com/media/mm2godlies/Peppermint.webp','GODLY','1/10',1,4,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-peppermint-gun-common','Peppermint (Gun)','https://supremevalues.com/media/mm2commons/Peppermint_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-peppermint-knife-common','Peppermint (Knife)','https://supremevalues.com/media/mm2commons/Peppermint_Knife.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-petals-untradable','Petals','https://supremevalues.com/media/mm2untradables/Petals.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-phantom-godly','Phantom','https://supremevalues.com/media/mm2godlies/Phantom.webp','GODLY','1/10',1,35,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-phaser-vintage','Phaser','https://supremevalues.com/media/mm2vintages/Phaser.webp','VINTAGE','1/10',1,5,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-phoenix-pet','Phoenix','https://supremevalues.com/media/mm2pets/Phoenix.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pie-untradable','Pie','https://supremevalues.com/media/mm2untradables/Pie.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pier-rare','Pier','https://supremevalues.com/media/mm2rares/Pier.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pig-pet','Pig','https://supremevalues.com/media/mm2pets/Pig.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-piggy-pet','Piggy','https://supremevalues.com/media/mm2pets/Piggy.webp','PET','3/10',3,55,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pine-gun-common','Pine (Gun)','https://supremevalues.com/media/mm2commons/Pine_Gun.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pine-knife-common','Pine (Knife)','https://supremevalues.com/media/mm2commons/Pine_Knife.webp','COMMON','3/10',3,85,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pink-uncommon','Pink','https://supremevalues.com/media/mm2uncommons/Pink.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pink-flaming-knife-untradable','Pink Flaming Knife','https://supremevalues.com/media/mm2untradables/Pink_Flaming_Knife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pink-sparkletime-untradable','Pink Sparkletime','https://supremevalues.com/media/mm2untradables/Pink_Sparkletime.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pirate-uncommon','Pirate','https://supremevalues.com/media/mm2uncommons/Pirate.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pixel-godly','Pixel','https://supremevalues.com/media/mm2godlies/Pixel.webp','GODLY','1/10',1,17,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pixie-dust-untradable','Pixie Dust','https://supremevalues.com/media/mm2untradables/Pixie_Dust.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pizza-untradable','Pizza','https://supremevalues.com/media/mm2untradables/Pizza.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-plaid-common','Plaid','https://supremevalues.com/media/mm2commons/Plaid.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-plasma-untradable','Plasma','https://supremevalues.com/media/mm2untradables/Plasma.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-plasma-set-set','Plasma Set','https://supremevalues.com/media/mm2godlies/Plasmablade.webp','SET','1/10',1,33,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-plasmabeam-godly','Plasmabeam','https://supremevalues.com/media/mm2godlies/Plasmabeam.webp','GODLY','1/10',1,18,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-plasmablade-godly','Plasmablade','https://supremevalues.com/media/mm2godlies/Plasmablade.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-plasmite-legendary','Plasmite','https://supremevalues.com/media/mm2legendaries/Plasmite.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-poison-untradable','Poison','https://supremevalues.com/media/mm2untradables/Poison.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-polar-bear-uncommon','Polar Bear','https://supremevalues.com/media/mm2uncommons/Polar_Bear.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pool-uncommon','Pool','https://supremevalues.com/media/mm2uncommons/Pool.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pool-noodle-uncommon','Pool Noodle','https://supremevalues.com/media/mm2uncommons/Pool_Noodle.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pop-art-gun-rare','Pop Art (Gun)','https://supremevalues.com/media/mm2rares/Pop_Art.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pop-art-knife-rare','Pop Art (Knife)','https://supremevalues.com/media/mm2rares/Pop_Art_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-popsicle-uncommon','Popsicle','https://supremevalues.com/media/mm2uncommons/Popsicle.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-popsicle-gun-uncommon','Popsicle (Gun)','https://supremevalues.com/media/mm2uncommons/Popsicle_Gun.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-portal-gun-uncommon','Portal (Gun)','https://supremevalues.com/media/mm2uncommons/Portal_Gun.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-portal-knife-rare','Portal (Knife)','https://supremevalues.com/media/mm2rares/Portal_Knife.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-potion-2017-uncommon','Potion (2017)','https://supremevalues.com/media/mm2uncommons/Potion.webp','UNCOMMON','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-potion-gun-uncommon','Potion (Gun)','https://supremevalues.com/media/mm2uncommons/Potion_Gun.webp','UNCOMMON','1/10',1,2,null,'2026-08-24T20:26:24.968Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-potion-knife-uncommon','Potion (Knife)','https://supremevalues.com/media/mm2uncommons/Potion_Knife.webp','UNCOMMON','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-potion-set-set','Potion Set','https://supremevalues.com/media/mm2uncommons/Potion_Knife.webp','SET','1/10',1,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-prank-bomb-untradable','Prank Bomb','https://supremevalues.com/media/mm2untradables/Prank_Bomb.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-predator-gun-legendary','Predator (Gun)','https://supremevalues.com/media/mm2legendaries/Predator_Gun.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-predator-knife-legendary','Predator (Knife)','https://supremevalues.com/media/mm2legendaries/Predator_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-present-common','Present','https://supremevalues.com/media/mm2commons/Present.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-present-2023-common','Present (2023)','https://supremevalues.com/media/mm2commons/Present_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-prince-vintage','Prince','https://supremevalues.com/media/mm2vintages/Prince.webp','VINTAGE','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-prism-common','Prism','https://supremevalues.com/media/mm2commons/Prism.webp','COMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-prismatic-godly','Prismatic','https://supremevalues.com/media/mm2godlies/Prismatic.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-pumpkin-untradable','Pumpkin','https://supremevalues.com/media/mm2untradables/Pumpkin.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pumpkin-2017-pet','Pumpkin (2017)','https://supremevalues.com/media/mm2pets/Pumpkin_2017.webp','PET','3/10',3,55,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2018-pet','Pumpkin (2018)','https://supremevalues.com/media/mm2pets/Pumpkin_2018.webp','PET','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2019-common','Pumpkin (2019)','https://supremevalues.com/media/mm2commons/Pumpkin_2019.webp','COMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2020-pet','Pumpkin (2020)','https://supremevalues.com/media/mm2pets/Pumpkin_2020.webp','PET','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2021-pet','Pumpkin (2021)','https://supremevalues.com/media/mm2pets/Pumpkin_2021.webp','PET','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2022-untradable','Pumpkin (2022)','https://supremevalues.com/media/mm2untradables/Pumpkin_Effect.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pumpkin-2023-common','Pumpkin (2023)','https://supremevalues.com/media/mm2commons/Pumpkin_2023.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-2025-uncommon','Pumpkin (2025)','https://supremevalues.com/media/mm2uncommons/Pumpkin_2025.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-knife-uncommon','Pumpkin (Knife)','https://supremevalues.com/media/mm2uncommons/Pumpkin_Knife.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-patch-uncommon','Pumpkin Patch','https://supremevalues.com/media/mm2uncommons/Pumpkin_Patch.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-pie-uncommon','Pumpkin Pie','https://supremevalues.com/media/mm2uncommons/Pumpkin_Pie.webp','UNCOMMON','2/10',2,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-pumpkin-set-set','Pumpkin Set','https://supremevalues.com/media/mm2pets/Purple_Pumpkin.webp','SET','3/10',3,403,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-pumpkin-set-2019-set','Pumpkin Set (2019)','https://supremevalues.com/media/mm2pets/Red_Pumpkin_2019.webp','SET','1/10',1,7,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-pumpkin-set-2020-set','Pumpkin Set (2020)','https://supremevalues.com/media/mm2pets/Red_Pumpkin_2020.webp','SET','2/10',2,39,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-pumpkin-set-2021-set','Pumpkin Set (2021)','https://supremevalues.com/media/mm2pets/Red_Pumpkin_2021.webp','SET','2/10',2,32,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-pumpkin-toy-untradable','Pumpkin Toy','https://supremevalues.com/media/mm2untradables/Pumpkin_Toy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-pumpking-godly','Pumpking','https://supremevalues.com/media/mm2godlies/Pumpking.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-purple-rare','Purple','https://supremevalues.com/media/mm2rares/Purple.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-purple-papers-misc','Purple Papers','https://supremevalues.com/media/mm2misc/Purple_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-purple-seer-godly','Purple Seer','https://supremevalues.com/media/mm2godlies/Purple_Seer.webp','GODLY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-radioactive-untradable','Radioactive','https://supremevalues.com/media/mm2untradables/Radioactive.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-rainbow-godly','Rainbow','https://supremevalues.com/media/mm2godlies/Rainbow_Knife.webp','GODLY','5/10',5,410,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rainbow-gun-rare','Rainbow (Gun)','https://supremevalues.com/media/mm2rares/Rainbow_Gun.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rainbow-knife-rare','Rainbow (Knife)','https://supremevalues.com/media/mm2rares/Rainbow_Knife.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rainbow-flaming-knife-untradable','Rainbow Flaming Knife','https://supremevalues.com/media/mm2untradables/Rainbow_Flaming_Knife.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-rainbow-gun-godly','Rainbow Gun','https://supremevalues.com/media/mm2godlies/Rainbow_Gun.webp','GODLY','5/10',5,420,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rainbow-set-set','Rainbow Set','https://supremevalues.com/media/mm2godlies/Rainbow_Gun.webp','SET','5/10',5,830,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-rainbows-untradable','Rainbows','https://supremevalues.com/media/mm2untradables/Rainbows.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-rare-egg-toy-untradable','Rare Egg Toy','https://supremevalues.com/media/mm2untradables/Rare_Egg.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-rare-egg-toy-25-untradable','Rare Egg Toy ''25','https://supremevalues.com/media/mm2untradables/Rare_Egg_25.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-rare-ornament-untradable','Rare Ornament','https://supremevalues.com/media/mm2untradables/Rare_Ornament.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-raygun-godly','Raygun','https://supremevalues.com/media/mm2godlies/Raygun.webp','GODLY','6/10',6,2100,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rb-knife-common','RB Knife','https://supremevalues.com/media/mm2commons/RB_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-rc-car-untradable','RC Car','https://supremevalues.com/media/mm2untradables/RC_Car.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-reaver-untradable','Reaver','https://supremevalues.com/media/mm2untradables/Reaver.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-reaver-variant-1-evo','Reaver (Variant 1)','https://supremevalues.com/media/mm2evos/ReaverV1.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-reaver-variant-2-evo','Reaver (Variant 2)','https://supremevalues.com/media/mm2evos/ReaverV2.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-reaver-variant-3-evo','Reaver (Variant 3)','https://supremevalues.com/media/mm2evos/ReaverV3.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-reaver-variant-4-evo','Reaver (Variant 4)','https://supremevalues.com/media/mm2evos/ReaverV4.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-reaver-sign-untradable','Reaver Sign','https://supremevalues.com/media/mm2untradables/Reaver_Sign.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-red-uncommon','Red','https://supremevalues.com/media/mm2uncommons/Red.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-red-fire-legendary','Red Fire','https://supremevalues.com/media/mm2legendaries/Red_Fire.webp','LEGENDARY','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-red-luger-godly','Red Luger','https://supremevalues.com/media/mm2godlies/Red_Luger.webp','GODLY','1/10',1,37,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-red-papers-misc','Red Papers','https://supremevalues.com/media/mm2misc/Red_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-red-scratch-legendary','Red Scratch','https://supremevalues.com/media/mm2legendaries/Scratch.webp','LEGENDARY','1/10',1,4,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-red-seer-godly','Red Seer','https://supremevalues.com/media/mm2godlies/Red_Seer.webp','GODLY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-red-sparkletime-untradable','Red Sparkletime','https://supremevalues.com/media/mm2untradables/Red_Sparkletime.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-reindeer-common','Reindeer','https://supremevalues.com/media/mm2commons/Reindeer_2025.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-reptile-common','Reptile','https://supremevalues.com/media/mm2commons/Reptile.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-retro-uncommon','Retro','https://supremevalues.com/media/mm2uncommons/Retro.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ribbon-common','Ribbon','https://supremevalues.com/media/mm2commons/Ribbon.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ribbons-common','Ribbons','https://supremevalues.com/media/mm2commons/Ribbons.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-rip-common','RIP','https://supremevalues.com/media/mm2commons/RIP.webp','COMMON','2/10',2,17,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ripper-gun-legendary','Ripper (Gun)','https://supremevalues.com/media/mm2legendaries/Ripper_Gun.webp','LEGENDARY','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ripper-knife-legendary','Ripper (Knife)','https://supremevalues.com/media/mm2legendaries/Ripper_Knife.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-ritual-rare','Ritual','https://supremevalues.com/media/mm2rares/Ritual.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-robot-rare','Robot','https://supremevalues.com/media/mm2rares/Robot.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rose-uncommon','Rose','https://supremevalues.com/media/mm2uncommons/Rose.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-roses-common','Roses','https://supremevalues.com/media/mm2commons/Roses.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-rudolph-pet','Rudolph','https://supremevalues.com/media/mm2pets/Rudolph.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-rune-legendary','Rune','https://supremevalues.com/media/mm2legendaries/Rune.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-rupture-legendary','Rupture','https://supremevalues.com/media/mm2legendaries/Rupture.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sakura-godly','Sakura','https://supremevalues.com/media/mm2godlies/Sakura.webp','GODLY','6/10',6,1360,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sakura-set-set','Sakura Set','https://supremevalues.com/media/mm2godlies/Sakura.webp','SET','6/10',6,2730,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-sammy-pet','Sammy','https://supremevalues.com/media/mm2pets/Sammy.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sand-common','Sand','https://supremevalues.com/media/mm2commons/Sand.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sand-bucket-untradable','Sand Bucket','https://supremevalues.com/media/mm2untradables/Sand_Bucket.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-sands-godly','Sands','https://supremevalues.com/media/mm2godlies/Sands.webp','GODLY','2/10',2,110,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sandy-common','Sandy','https://supremevalues.com/media/mm2commons/Sandy.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sandy-gun-common','Sandy (Gun)','https://supremevalues.com/media/mm2commons/Sandy_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-common','Santa','https://supremevalues.com/media/mm2commons/Santa_2017.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-2018-common','Santa (2018)','https://supremevalues.com/media/mm2commons/Santa_2018.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-2019-pet','Santa (2019)','https://supremevalues.com/media/untradable.png','PET',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-2023-common','Santa (2023)','https://supremevalues.com/media/mm2commons/Santa_2023.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-gun-common','Santa (Gun)','https://supremevalues.com/media/mm2commons/Santa_Gun.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-knife-common','Santa (Knife)','https://supremevalues.com/media/mm2commons/Santa_Knife.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-dog-pet','Santa Dog','https://supremevalues.com/media/mm2pets/Santa_Dog.webp','PET','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-santa-plushie-untradable','Santa Plushie','https://supremevalues.com/media/mm2untradables/Santa_Plushie.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-santas-magic-legendary','Santa''s Magic','https://supremevalues.com/media/mm2legendaries/Santas_Magic.webp','LEGENDARY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-santas-set-legend-set','Santa''s Set (Legend.)','https://supremevalues.com/media/mm2legendaries/Santas_Magic.webp','SET','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-santas-spirit-legendary','Santa''s Spirit','https://supremevalues.com/media/mm2legendaries/Santas_Spirit.webp','LEGENDARY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-saw-godly','Saw','https://supremevalues.com/media/mm2godlies/Saw.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-scarecrow-pet','Scarecrow','https://supremevalues.com/media/mm2pets/Scarecrow.webp','PET','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-scarf-common','Scarf','https://supremevalues.com/media/mm2commons/Scarf.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-scratch-set-set','Scratch Set','https://supremevalues.com/media/mm2legendaries/Scratch.webp','SET','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-seahorsey-pet','Seahorsey','https://supremevalues.com/media/mm2pets/Seahorsey.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-seer-godly','Seer','https://supremevalues.com/media/mm2godlies/Seer.webp','GODLY','1/10',1,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-shaded-common','Shaded','https://supremevalues.com/media/mm2commons/Shaded.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-shadow-vintage','Shadow','https://supremevalues.com/media/mm2vintages/Shadow.webp','VINTAGE','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-shadow-pumpkin-pet','Shadow Pumpkin','https://supremevalues.com/media/mm2pets/Shadow_Pumpkin_2021.webp','PET','2/10',2,5,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-shark-godly','Shark','https://supremevalues.com/media/mm2godlies/Shark.webp','GODLY','1/10',1,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sharky-rare','Sharky','https://supremevalues.com/media/mm2rares/Sharky.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-shiny-legendary','Shiny','https://supremevalues.com/media/mm2legendaries/Shiny.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sidewinder-common','Sidewinder','https://supremevalues.com/media/mm2commons/Sidewinder.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-silent-night-gun-rare','Silent Night (Gun)','https://supremevalues.com/media/mm2rares/Silent_Night_Gun.webp','RARE','2/10',2,12,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-silent-night-knife-rare','Silent Night (Knife)','https://supremevalues.com/media/mm2rares/Silent_Night_Knife.webp','RARE','2/10',2,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-silent-night-set-set','Silent Night Set','https://supremevalues.com/media/mm2rares/Silent_Night_Knife.webp','SET','2/10',2,62,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-sit-untradable','Sit','https://supremevalues.com/media/mm2untradables/Sit.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-skate-set-set','Skate Set','https://supremevalues.com/media/mm2commons/Ollie.webp','SET','2/10',2,23,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-skeleton-key-misc','Skeleton Key','https://supremevalues.com/media/mm2misc/Skeleton_Key.webp','MISC','1/10',1,5,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-skelly-pet','Skelly','https://supremevalues.com/media/mm2pets/Skelly.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sketch-uncommon','Sketch','https://supremevalues.com/media/mm2uncommons/Sketch.webp','UNCOMMON','2/10',2,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sketchy-common','Sketchy','https://supremevalues.com/media/mm2commons/Sketchy.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-skool-common','Skool','https://supremevalues.com/media/mm2commons/Skool.webp','COMMON','2/10',2,8,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-skulls-legendary','Skulls','https://supremevalues.com/media/mm2legendaries/Skulls.webp','LEGENDARY','1/10',1,4,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-skully-pet','Skully','https://supremevalues.com/media/mm2pets/Skully.webp','PET','2/10',2,15,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-skyline-common','Skyline','https://supremevalues.com/media/mm2commons/Skyline.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-slashed-common','Slashed','https://supremevalues.com/media/mm2commons/Slashed.webp','COMMON','2/10',2,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-slasher-godly','Slasher','https://supremevalues.com/media/mm2godlies/Slasher.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-slasher-set-set','Slasher Set','https://supremevalues.com/media/mm2godlies/Slasher.webp','SET','1/10',1,37,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-slate-common','Slate','https://supremevalues.com/media/mm2commons/Slate.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sleigh-rare','Sleigh','https://supremevalues.com/media/mm2rares/Sleigh.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sleight-untradable','Sleight','https://supremevalues.com/media/mm2untradables/Sleight.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-slime-gun-common','Slime (Gun)','https://supremevalues.com/media/mm2commons/Slime_Gun.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-slime-knife-common','Slime (Knife)','https://supremevalues.com/media/mm2commons/Slime_Knife.webp','COMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-slime-set-set','Slime Set','https://supremevalues.com/media/mm2commons/Slime_Knife.webp','SET','1/10',1,2,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-slimy-common','Slimy','https://supremevalues.com/media/mm2commons/Slimy.webp','COMMON','2/10',2,20,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-small-set-103-set','Small Set (103)','https://supremevalues.com/media/mm2godlies/Red_Seer.webp','SET','4/10',4,1250,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-small-set-107-set','Small Set (107)','https://supremevalues.com/media/mm2godlies/Yellow_Seer.webp','SET','4/10',4,1285,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-snakebite-gun-rare','Snakebite (Gun)','https://supremevalues.com/media/mm2rares/Snakebite_Gun.webp','RARE','1/10',1,1,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snakebite-knife-rare','Snakebite (Knife)','https://supremevalues.com/media/mm2rares/Snakebite_Knife.webp','RARE','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snakebite-set-set','Snakebite Set','https://supremevalues.com/media/mm2rares/Snakebite_Knife.webp','SET','2/10',2,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-snow-dagger-godly','Snow Dagger','https://supremevalues.com/media/mm2godlies/Snow_Dagger.webp','GODLY','3/10',3,240,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snow-set-set','Snow Set','https://supremevalues.com/media/mm2godlies/Snowcannon.webp','SET','5/10',5,1090,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-snowball-untradable','Snowball','https://supremevalues.com/media/mm2untradables/Snowball.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-snowball-gun-common','Snowball (Gun)','https://supremevalues.com/media/mm2commons/Snowball_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowball-knife-common','Snowball (Knife)','https://supremevalues.com/media/mm2commons/Snowball_Knife.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowballs-untradable','Snowballs','https://supremevalues.com/media/mm2untradables/Snowballs.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-snowbear-pet','Snowbear','https://supremevalues.com/media/mm2pets/Snowbear.webp','PET','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowcannon-godly','Snowcannon','https://supremevalues.com/media/mm2godlies/Snowcannon.webp','GODLY','5/10',5,850,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snowfall-common','Snowfall','https://supremevalues.com/media/mm2commons/Snowfall.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowflake-godly','Snowflake','https://supremevalues.com/media/mm2godlies/Snowflake.webp','GODLY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snowflake-key-misc','Snowflake Key','https://supremevalues.com/media/mm2misc/Snow_Key.webp','MISC','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowflakes-rare','Snowflakes','https://supremevalues.com/media/mm2rares/Snowflakes.webp','RARE','2/10',2,12,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snowflakes-2017-untradable','Snowflakes (2017)','https://supremevalues.com/media/mm2untradables/Snowflakes_2017.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-snowflakes-gun-common','Snowflakes (Gun)','https://supremevalues.com/media/mm2commons/Snowflakes_Gun.webp','COMMON','2/10',2,30,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowflakes-knife-common','Snowflakes (Knife)','https://supremevalues.com/media/mm2commons/Snowflakes_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowglobe-rare','Snowglobe','https://supremevalues.com/media/mm2rares/Snowglobe.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snowman-pet','Snowman','https://supremevalues.com/media/untradable.png','PET',null,null,null,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowman-2023-uncommon','Snowman (2023)','https://supremevalues.com/media/mm2uncommons/Snowman_2023.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowman-2024-uncommon','Snowman (2024)','https://supremevalues.com/media/mm2uncommons/Snowman_2024.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-snowstorm-godly','Snowstorm','https://supremevalues.com/media/mm2godlies/Snowstorm.webp','GODLY','4/10',4,260,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-snowy-rare','Snowy','https://supremevalues.com/media/mm2rares/Snowy.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-soda-uncommon','Soda','https://supremevalues.com/media/mm2uncommons/Soda.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-soda-gun-uncommon','Soda (Gun)','https://supremevalues.com/media/mm2uncommons/Soda_Gun.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-soda-knife-uncommon','Soda (Knife)','https://supremevalues.com/media/mm2uncommons/Soda_Knife.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-soul-godly','Soul','https://supremevalues.com/media/mm2godlies/Soul.webp','GODLY','5/10',5,615,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-soul-set-set','Soul Set','https://supremevalues.com/media/mm2godlies/Soul.webp','SET','5/10',5,1220,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-space-rare','Space','https://supremevalues.com/media/mm2rares/Space.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sparkle-legendary','Sparkle','https://supremevalues.com/media/mm2legendaries/Sparkle.webp','LEGENDARY','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sparkle-set-set','Sparkle Set','https://supremevalues.com/media/mm2commons/Sparkle10.webp','SET','2/10',2,127,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-sparkle1-common','Sparkle1','https://supremevalues.com/media/mm2commons/Sparkle1.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle2-common','Sparkle2','https://supremevalues.com/media/mm2commons/Sparkle2.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle3-common','Sparkle3','https://supremevalues.com/media/mm2commons/Sparkle3.webp','COMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle4-common','Sparkle4','https://supremevalues.com/media/mm2commons/Sparkle4.webp','COMMON','2/10',2,10,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle5-common','Sparkle5','https://supremevalues.com/media/mm2commons/Sparkle5.webp','COMMON','2/10',2,8,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle6-common','Sparkle6','https://supremevalues.com/media/mm2commons/Sparkle6.webp','COMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle7-common','Sparkle7','https://supremevalues.com/media/mm2commons/Sparkle7.webp','COMMON','2/10',2,18,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle8-common','Sparkle8','https://supremevalues.com/media/mm2commons/Sparkle8.webp','COMMON','2/10',2,20,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle9-common','Sparkle9','https://supremevalues.com/media/mm2commons/Sparkle9.webp','COMMON','2/10',2,30,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sparkle10-common','Sparkle10','https://supremevalues.com/media/mm2commons/Sparkle10.webp','COMMON','2/10',2,20,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-spearmint-gun-rare','Spearmint (Gun)','https://supremevalues.com/media/mm2rares/Spearmint_Gun.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spearmint-knife-rare','Spearmint (Knife)','https://supremevalues.com/media/mm2rares/Spearmint_Knife.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spectral-gun-legendary','Spectral (Gun)','https://supremevalues.com/media/mm2legendaries/Spectral_Gun.webp','LEGENDARY','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spectral-knife-legendary','Spectral (Knife)','https://supremevalues.com/media/mm2legendaries/Spectral_Knife.webp','LEGENDARY','2/10',2,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spectral-set-set','Spectral Set','https://supremevalues.com/media/mm2legendaries/Spectral_Knife.webp','SET','2/10',2,53,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-spectre-godly','Spectre','https://supremevalues.com/media/mm2godlies/Spectre.webp','GODLY','1/10',1,35,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spectre-set-set','Spectre Set','https://supremevalues.com/media/mm2godlies/Spectre.webp','SET','1/10',1,70,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-spectrum-rare','Spectrum','https://supremevalues.com/media/mm2rares/Spectrum.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-spellbook-untradable','Spellbook','https://supremevalues.com/media/mm2untradables/Spellbook.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-spider-godly','Spider','https://supremevalues.com/media/mm2godlies/Spider.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spider-2023-common','Spider (2023)','https://supremevalues.com/media/mm2commons/Spider2023.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-spirit-godly','Spirit','https://supremevalues.com/media/mm2godlies/Spirit.webp','GODLY','5/10',5,605,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-spitfire-rare','Spitfire','https://supremevalues.com/media/mm2rares/Spitfire.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-splash-gun-legendary','Splash (Gun)','https://supremevalues.com/media/mm2legendaries/Splash_Gun.webp','LEGENDARY','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-splash-knife-legendary','Splash (Knife)','https://supremevalues.com/media/mm2legendaries/Splash_Knife.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-splat-common','Splat','https://supremevalues.com/media/mm2commons/Splat.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-splatter-common','Splatter','https://supremevalues.com/media/mm2commons/Splatter.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-splitter-vintage','Splitter','https://supremevalues.com/media/mm2vintages/Splitter.webp','VINTAGE','1/10',1,3,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-spray-paint-untradable','Spray Paint','https://supremevalues.com/media/mm2untradables/Spray_Paint.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-spring-rare','Spring','https://supremevalues.com/media/mm2rares/Spring.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sprint-untradable','Sprint','https://supremevalues.com/media/mm2untradables/Sprint.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-squire-rare','Squire','https://supremevalues.com/media/mm2rares/Squire.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-stainless-common','Stainless','https://supremevalues.com/media/mm2commons/Stainless.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stalker-uncommon','Stalker','https://supremevalues.com/media/mm2uncommons/Stalker.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-star-common','Star','https://supremevalues.com/media/mm2commons/Star.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-starfish-gun-common','Starfish (Gun)','https://supremevalues.com/media/mm2commons/Starfish.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-starfish-knife-common','Starfish (Knife)','https://supremevalues.com/media/mm2commons/Starfish_Knife.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-starry-uncommon','Starry','https://supremevalues.com/media/mm2uncommons/Starry.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-starry-gun-rare','Starry (Gun)','https://supremevalues.com/media/mm2rares/Starry_Gun.webp','RARE','2/10',2,22,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-starry-knife-rare','Starry (Knife)','https://supremevalues.com/media/mm2rares/Starry_Knife.webp','RARE','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-stars-untradable','Stars','https://supremevalues.com/media/mm2untradables/Stars.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-stars-gun-uncommon','Stars (Gun)','https://supremevalues.com/media/mm2uncommons/Stars_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stars-knife-uncommon','Stars (Knife)','https://supremevalues.com/media/mm2uncommons/Stars_Knife.webp','UNCOMMON','2/10',2,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-static-common','Static','https://supremevalues.com/media/mm2commons/Static.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-steambird-pet','Steambird','https://supremevalues.com/media/mm2pets/Steambird.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-steel-gun-uncommon','Steel (Gun)','https://supremevalues.com/media/mm2uncommons/Steel_Gun.webp','UNCOMMON','2/10',2,8,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-steel-knife-uncommon','Steel (Knife)','https://supremevalues.com/media/mm2uncommons/Steel_Knife.webp','UNCOMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stickers-untradable','Stickers','https://supremevalues.com/media/mm2untradables/Xmas_Stickers.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-stockings-common','Stockings','https://supremevalues.com/media/mm2commons/Stockings.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stockings-2024-common','Stockings (2024)','https://supremevalues.com/media/mm2commons/Stockings_2024.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stockings-gun-uncommon','Stockings (Gun)','https://supremevalues.com/media/mm2uncommons/Stockings_Gun.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-stockings-knife-uncommon','Stockings (Knife)','https://supremevalues.com/media/mm2uncommons/Stockings_Knife.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-storm-rare','Storm','https://supremevalues.com/media/mm2rares/Storm.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-strawberries-untradable','Strawberries','https://supremevalues.com/media/mm2untradables/Strawberries.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-strawberries-gun-common','Strawberries (Gun)','https://supremevalues.com/media/mm2commons/Strawberries_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-strawberries-knife-common','Strawberries (Knife)','https://supremevalues.com/media/mm2commons/Strawberries_Knife.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-striped-gun-common','Striped (Gun)','https://supremevalues.com/media/mm2commons/Striped_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-striped-knife-common','Striped (Knife)','https://supremevalues.com/media/mm2commons/Striped.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sub-common','Sub','https://supremevalues.com/media/mm2commons/Sub.webp','COMMON','2/10',2,4,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sugar-godly','Sugar','https://supremevalues.com/media/mm2godlies/Sugar.webp','GODLY','1/10',1,32,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sun-rare','Sun','https://supremevalues.com/media/mm2rares/Sunset.webp','RARE','2/10',2,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sun-set-set','Sun Set','https://supremevalues.com/media/mm2godlies/Sunrise.webp','SET','6/10',6,1800,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-sunbeams-untradable','Sunbeams','https://supremevalues.com/media/mm2untradables/Sunbeams.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-sunny-rare','Sunny','https://supremevalues.com/media/mm2rares/Sunny.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sunrise-godly','Sunrise','https://supremevalues.com/media/mm2godlies/Sunrise.webp','GODLY','6/10',6,1150,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sunset-godly','Sunset','https://supremevalues.com/media/mm2godlies/Sunset.webp','GODLY','5/10',5,650,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-survivor-sign-untradable','Survivor Sign','https://supremevalues.com/media/mm2untradables/Survivor_Sign.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-sweater-uncommon','Sweater','https://supremevalues.com/media/mm2uncommons/Sweater.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-sweet-godly','Sweet','https://supremevalues.com/media/mm2godlies/Sweet.webp','GODLY','3/10',3,150,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-sweet-set-set','Sweet Set','https://supremevalues.com/media/mm2godlies/Sweet.webp','SET','3/10',3,305,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-sweetheart-common','Sweetheart','https://supremevalues.com/media/mm2commons/Sweetheart.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-swirl-rare','Swirl','https://supremevalues.com/media/mm2rares/Swirl.webp','RARE','2/10',2,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-swirls-untradable','Swirls','https://supremevalues.com/media/mm2untradables/Swirls.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-swirly-axe-ancient','Swirly Axe','https://supremevalues.com/media/mm2ancients/Swirly_Axe.webp','ANCIENT','1/10',1,38,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-swirly-blade-godly','Swirly Blade','https://supremevalues.com/media/mm2godlies/Swirly_Blade.webp','GODLY','1/10',1,12,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-swirly-gun-godly','Swirly Gun','https://supremevalues.com/media/mm2godlies/Swirly_Gun.webp','GODLY','1/10',1,18,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-swirly-radio-untradable','Swirly Radio','https://supremevalues.com/media/mm2untradables/Swirly_Radio.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-swirly-set-set','Swirly Set','https://supremevalues.com/media/mm2ancients/Swirly_Axe.webp','SET','1/10',1,56,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-synthwave-untradable','Synthwave','https://supremevalues.com/media/mm2untradables/Synthwave.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-synthwave-var-1-evo','Synthwave (Var. 1)','https://supremevalues.com/media/mm2evos/SynthwaveV1.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-synthwave-var-2-evo','Synthwave (Var. 2)','https://supremevalues.com/media/mm2evos/SynthwaveV2.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-synthwave-var-3-evo','Synthwave (Var. 3)','https://supremevalues.com/media/mm2evos/SynthwaveV3.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-synthwave-var-4-evo','Synthwave (Var. 4)','https://supremevalues.com/media/mm2evos/SynthwaveV4.webp','EVO',null,null,null,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-tailslide-common','Tailslide','https://supremevalues.com/media/mm2commons/Tailslide.webp','COMMON','2/10',2,7,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tankie-pet','Tankie','https://supremevalues.com/media/mm2pets/Tankie.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-teddy-pet','Teddy','https://supremevalues.com/media/mm2pets/Teddy.webp','PET','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-teddy-bear-untradable','Teddy Bear','https://supremevalues.com/media/mm2untradables/Teddy_Bear.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-tides-godly','Tides','https://supremevalues.com/media/mm2godlies/Tides.webp','GODLY','1/10',1,10,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-tiger-uncommon','Tiger','https://supremevalues.com/media/mm2uncommons/Tiger.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tnl-common','TNL','https://supremevalues.com/media/mm2commons/TNL.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tourist-common','Tourist','https://supremevalues.com/media/mm2commons/Tourist.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-toxic-untradable','Toxic','https://supremevalues.com/media/mm2untradables/Toxic.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-toxic-gun-rare','Toxic (Gun)','https://supremevalues.com/media/mm2rares/Toxic_Gun.webp','RARE','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-toxic-knife-rare','Toxic (Knife)','https://supremevalues.com/media/mm2rares/Toxic_Knife.webp','RARE','2/10',2,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-toxic-set-set','Toxic Set','https://supremevalues.com/media/mm2rares/Toxic_Knife.webp','SET','2/10',2,7,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-toy-gun-common','Toy (Gun)','https://supremevalues.com/media/mm2commons/Toy_Gun.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-toy-knife-common','Toy (Knife)','https://supremevalues.com/media/mm2commons/Toy_Knife.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-toy-candy-untradable','Toy Candy','https://supremevalues.com/media/mm2untradables/Toy_Candy.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-toy-candy-2-untradable','Toy Candy 2','https://supremevalues.com/media/mm2untradables/Toy_Candy2.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-toy-candy-3-untradable','Toy Candy 3','https://supremevalues.com/media/mm2untradables/Toy_Candy3.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-toy-token-untradable','Toy Token','https://supremevalues.com/media/mm2untradables/Toy_Token.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-trap-untradable','Trap','https://supremevalues.com/media/mm2untradables/Trap.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-traveler-gun-legendary','Traveler (Gun)','https://supremevalues.com/media/mm2legendaries/Traveler_Gun.webp','LEGENDARY','2/10',2,50,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-traveler-knife-legendary','Traveler (Knife)','https://supremevalues.com/media/mm2legendaries/Traveler_Knife.webp','LEGENDARY','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-traveler-set-set','Traveler Set','https://supremevalues.com/media/mm2legendaries/Traveler_Gun.webp','SET','2/10',2,53,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-travelers-axe-ancient','Traveler''s Axe','https://supremevalues.com/media/mm2ancients/Travelers_Axe.webp','ANCIENT','5/10',5,8100,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-travelers-flame-untradable','Traveler''s Flame','https://supremevalues.com/media/mm2untradables/TravelersFlame.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-travelers-gun-godly','Traveler''s Gun','https://supremevalues.com/media/mm2godlies/Travelers_Gun.webp','GODLY','5/10',5,5600,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-travelers-set-set','Traveler''s Set','https://supremevalues.com/media/mm2ancients/Travelers_Axe.webp','SET','5/10',5,13700,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-traveller-pet','Traveller','https://supremevalues.com/media/mm2pets/Traveller.webp','PET','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-treat-godly','Treat','https://supremevalues.com/media/mm2godlies/Treat.webp','GODLY','3/10',3,155,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-treat-bucket-untradable','Treat Bucket','https://supremevalues.com/media/mm2untradables/Treat_Bucket.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-treats-untradable','Treats','https://supremevalues.com/media/mm2untradables/Treats.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-treats-gun-uncommon','Treats (Gun)','https://supremevalues.com/media/mm2uncommons/Treats_Gun.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-treats-knife-uncommon','Treats (Knife)','https://supremevalues.com/media/mm2uncommons/Treats_Knife.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tree-untradable','Tree','https://supremevalues.com/media/mm2untradables/Tree.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-tree-2017-uncommon','Tree (2017)','https://supremevalues.com/media/mm2uncommons/Tree.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tree-2021-uncommon','Tree (2021)','https://supremevalues.com/media/mm2uncommons/Tree_2021.webp','UNCOMMON','2/10',2,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tree-2023-rare','Tree (2023)','https://supremevalues.com/media/mm2rares/Tree_2023.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-tree-gun-legendary','Tree (Gun)','https://supremevalues.com/media/mm2legendaries/Tree_Gun.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-tree-knife-legendary','Tree (Knife)','https://supremevalues.com/media/mm2legendaries/Tree_Knife.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-trees-common','Trees','https://supremevalues.com/media/mm2commons/Trees.webp','COMMON','2/10',2,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-tropical-rare','Tropical','https://supremevalues.com/media/mm2rares/Tropical.webp','RARE','1/10',1,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-tulip-common','Tulip','https://supremevalues.com/media/mm2commons/Tulip.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-turkey-godly','Turkey','https://supremevalues.com/media/mm2godlies/Turkey.webp','GODLY','5/10',5,2450,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-turtle-uncommon','Turtle','https://supremevalues.com/media/mm2uncommons/Turtle.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-turtles-uncommon','Turtles','https://supremevalues.com/media/mm2uncommons/Turtles.webp','UNCOMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ufo-pet','UFO','https://supremevalues.com/media/mm2pets/UFO.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ufos-untradable','UFOs','https://supremevalues.com/media/mm2untradables/UFOs.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-ufos-gun-common','UFOs (Gun)','https://supremevalues.com/media/mm2commons/UFOs_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ufos-knife-common','UFOs (Knife)','https://supremevalues.com/media/mm2commons/UFOs_Knife.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-ultra-wrap-misc','Ultra Wrap','https://supremevalues.com/media/mm2misc/Ultra_Papers.webp','MISC','1/10',1,2,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-uncommon-ornament-untradable','Uncommon Ornament','https://supremevalues.com/media/mm2untradables/Uncommon_Ornament.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-universe-legendary','Universe','https://supremevalues.com/media/mm2legendaries/Universe.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-valentine-common','Valentine','https://supremevalues.com/media/mm2commons/Valentine.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-vampire-uncommon','Vampire','https://supremevalues.com/media/mm2uncommons/Vampire.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-vampire-gun-legendary','Vampire (Gun)','https://supremevalues.com/media/mm2legendaries/Vampire_Gun.webp','LEGENDARY','2/10',2,45,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-vampire-knife-legendary','Vampire (Knife)','https://supremevalues.com/media/mm2legendaries/Vampire_Knife.webp','LEGENDARY','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-vampire-bat-pet','Vampire Bat','https://supremevalues.com/media/mm2pets/Vampire_Bat.webp','PET','1/10',1,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-vampire-set-legend-set','Vampire Set (Legend.)','https://supremevalues.com/media/mm2legendaries/Vampire_Gun.webp','SET','2/10',2,48,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-vampire-set-rare-set','Vampire Set (Rare)','https://supremevalues.com/media/mm2rares/Vampire_Gun.webp','SET','2/10',2,4,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-vampires-axe-ancient','Vampire''s Axe','https://supremevalues.com/media/mm2ancients/Vampires_Axe.webp','ANCIENT','6/10',6,1500,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-vampires-edge-godly','Vampire''s Edge','https://supremevalues.com/media/mm2godlies/Vampires_Edge.webp','GODLY','1/10',1,15,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-vampires-gun-godly','Vampire''s Gun','https://supremevalues.com/media/mm2godlies/Vampires_Gun.webp','GODLY','5/10',5,1950,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-vampires-set-set','Vampire''s Set','https://supremevalues.com/media/mm2ancients/Vampires_Axe.webp','SET','6/10',6,3450,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-vampiric-untradable','Vampiric','https://supremevalues.com/media/mm2untradables/Vampiric.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-velvet-cake-untradable','Velvet Cake','https://supremevalues.com/media/mm2untradables/Velvet_Cake.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-versus-untradable','Versus','https://supremevalues.com/media/mm2untradables/Versus.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-villagers-lantern-untradable','Villager''s Lantern','https://supremevalues.com/media/mm2untradables/Villagers_Lantern.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-vines-gun-common','Vines (Gun)','https://supremevalues.com/media/mm2commons/Vines_Gun.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-vines-knife-common','Vines (Knife)','https://supremevalues.com/media/mm2commons/Vines_Knife.webp','COMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-vintage-set-set','Vintage Set','https://supremevalues.com/media/mm2vintages/America.webp','SET','1/10',1,59,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-viper-legendary','Viper','https://supremevalues.com/media/mm2legendaries/Viper.webp','LEGENDARY','2/10',2,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-virtual-godly','Virtual','https://supremevalues.com/media/mm2godlies/Virtual.webp','GODLY','1/10',1,13,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-virtual-set-set','Virtual Set','https://supremevalues.com/media/mm2godlies/Virtual.webp','SET','1/10',1,30,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-void-uncommon','Void','https://supremevalues.com/media/mm2uncommons/Void.webp','UNCOMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-volleyball-untradable','Volleyball','https://supremevalues.com/media/mm2untradables/Volleyball.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-vortex-rare','Vortex','https://supremevalues.com/media/mm2rares/Vortex.webp','RARE','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-wanwood-uncommon','Wanwood','https://supremevalues.com/media/mm2uncommons/Wanwood.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-watcher-gun-rare','Watcher (Gun)','https://supremevalues.com/media/mm2rares/Watcher_Gun.webp','RARE','2/10',2,20,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-watcher-knife-rare','Watcher (Knife)','https://supremevalues.com/media/mm2rares/Watcher_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-water-balloon-untradable','Water Balloon','https://supremevalues.com/media/mm2untradables/Water_Balloon.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-watergun-godly','Watergun','https://supremevalues.com/media/mm2godlies/Watergun.webp','GODLY','3/10',3,240,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-waves-godly','Waves','https://supremevalues.com/media/mm2godlies/Waves.webp','GODLY','4/10',4,280,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-wavy-gun-common','Wavy (Gun)','https://supremevalues.com/media/mm2commons/Wavy_Gun.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wavy-knife-common','Wavy (Knife)','https://supremevalues.com/media/mm2commons/Wavy_Knife.webp','COMMON','1/10',1,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-web-legendary','Web','https://supremevalues.com/media/mm2legendaries/Web.webp','LEGENDARY','1/10',1,41,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-webbed-gun-common','Webbed (Gun)','https://supremevalues.com/media/mm2commons/Webbed_Gun.webp','COMMON','2/10',2,25,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-webbed-knife-common','Webbed (Knife)','https://supremevalues.com/media/mm2commons/Webbed_Knife.webp','COMMON','2/10',2,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-webs-uncommon','Webs','https://supremevalues.com/media/mm2uncommons/Webs.webp','UNCOMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-whiteout-common','Whiteout','https://supremevalues.com/media/mm2commons/Whiteout.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-winters-edge-godly','Winter''s Edge','https://supremevalues.com/media/mm2godlies/Winters_Edge.webp','GODLY','1/10',1,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-witch-common','Witch','https://supremevalues.com/media/mm2commons/Witch.webp','COMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-witchs-brew-uncommon','Witch''s Brew','https://supremevalues.com/media/mm2uncommons/Witchs_Brew.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-witchbrew-uncommon','Witchbrew','https://supremevalues.com/media/mm2uncommons/Witchbrew.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-witched-legendary','Witched','https://supremevalues.com/media/mm2legendaries/Witched.webp','LEGENDARY','2/10',2,3,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-wolf-uncommon','Wolf','https://supremevalues.com/media/mm2uncommons/Wolf.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wood-common','Wood','https://supremevalues.com/media/mm2commons/Wood.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wooden-uncommon','Wooden','https://supremevalues.com/media/mm2uncommons/Wooden.webp','UNCOMMON','1/10',1,41,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wraith-untradable','Wraith','https://supremevalues.com/media/mm2untradables/Wraith.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-wraith-gun-rare','Wraith (Gun)','https://supremevalues.com/media/mm2rares/Wraith_Gun.webp','RARE','2/10',2,11,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-wraith-knife-rare','Wraith (Knife)','https://supremevalues.com/media/mm2rares/Wraith_Knife.webp','RARE','2/10',2,5,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-wraithfire-untradable','Wraithfire','https://supremevalues.com/media/mm2untradables/Wraithfire.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-wraiths-gun-uncommon','Wraiths (Gun)','https://supremevalues.com/media/mm2uncommons/Wraiths_Gun.webp','UNCOMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wraiths-knife-uncommon','Wraiths (Knife)','https://supremevalues.com/media/mm2uncommons/Wraiths_Knife.webp','UNCOMMON','2/10',2,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wrap-gun-uncommon','Wrap (Gun)','https://supremevalues.com/media/mm2uncommons/Wrap_Gun.webp','UNCOMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wrap-knife-uncommon','Wrap (Knife)','https://supremevalues.com/media/mm2uncommons/Wrap_Knife.webp','UNCOMMON','2/10',2,12,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wrap-set-set','Wrap Set','https://supremevalues.com/media/mm2uncommons/Wrap_Knife.webp','SET','2/10',2,24,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-wrapped-gun-common','Wrapped (Gun)','https://supremevalues.com/media/mm2commons/Wrapped_Gun.webp','COMMON','2/10',2,30,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wrapped-knife-common','Wrapped (Knife)','https://supremevalues.com/media/mm2commons/Wrapped_Knife.webp','COMMON','2/10',2,31,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-wrapping-paper-set-set','Wrapping Paper Set','https://supremevalues.com/media/mm2misc/Gold_Papers.webp','SET','1/10',1,14,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-wreaths-uncommon','Wreaths','https://supremevalues.com/media/mm2uncommons/Wreaths.webp','UNCOMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-x-ray-untradable','X-Ray','https://supremevalues.com/media/mm2untradables/X_Ray.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-xbox-common','Xbox','https://supremevalues.com/media/mm2commons/Xbox.webp','COMMON','1/10',1,21,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-xeno-untradable','Xeno','https://supremevalues.com/media/mm2untradables/Xeno.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-xeno-gun-rare','Xeno (Gun)','https://supremevalues.com/media/mm2rares/Xeno_Gun.webp','RARE','2/10',2,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-xeno-knife-rare','Xeno (Knife)','https://supremevalues.com/media/mm2rares/Xeno_Knife.webp','RARE','2/10',2,31,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-xeno-set-set','Xeno Set','https://supremevalues.com/media/mm2godlies/Xenoknife.webp','SET','5/10',5,620,null,'2026-08-24T20:26:24.966Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

insert into public.game_catalog_items
  (game_id,item_id,item_name,image_url,category,demand_label,demand_score,supreme_value,gcash_value,source_updated_at)
values
  ('mm2','mm2-xenoknife-godly','Xenoknife','https://supremevalues.com/media/mm2godlies/Xenoknife.webp','GODLY','5/10',5,310,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-xenoshot-godly','Xenoshot','https://supremevalues.com/media/mm2godlies/Xenoshot.webp','GODLY','5/10',5,310,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-xmas-godly','Xmas','https://supremevalues.com/media/mm2godlies/Xmas.webp','GODLY','1/10',1,7,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-yellow-common','Yellow','https://supremevalues.com/media/mm2commons/Yellow.webp','COMMON','1/10',1,11,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-yellow-seer-godly','Yellow Seer','https://supremevalues.com/media/mm2godlies/Yellow_Seer.webp','GODLY','1/10',1,2,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-yummy-rare','Yummy','https://supremevalues.com/media/mm2rares/Yummy.webp','RARE','1/10',1,21,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-zen-untradable','Zen','https://supremevalues.com/media/mm2untradables/Zen.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-zombie-uncommon','Zombie','https://supremevalues.com/media/mm2uncommons/Zombie.webp','UNCOMMON','2/10',2,7,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombie-2023-uncommon','Zombie (2023)','https://supremevalues.com/media/mm2uncommons/Zombie_2023.webp','UNCOMMON','2/10',2,3,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombie-gun-uncommon','Zombie (Gun)','https://supremevalues.com/media/mm2uncommons/Zombie_Gun.webp','UNCOMMON','1/10',1,5,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombie-knife-uncommon','Zombie (Knife)','https://supremevalues.com/media/mm2uncommons/Zombie_Knife.webp','UNCOMMON','1/10',1,1,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombie-dog-pet','Zombie Dog','https://supremevalues.com/media/mm2pets/Zombie_Dog.webp','PET','4/10',4,750,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombie-friend-untradable','Zombie Friend','https://supremevalues.com/media/mm2untradables/Zombie_Friend.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-zombie-set-set','Zombie Set','https://supremevalues.com/media/mm2uncommons/Zombie_Gun.webp','SET','1/10',1,6,null,'2026-08-24T20:26:24.966Z'),
  ('mm2','mm2-zombie-sign-untradable','Zombie Sign','https://supremevalues.com/media/mm2untradables/Zombie_Sign.webp','UNTRADABLE',null,null,null,null,'2026-08-24T20:26:24.969Z'),
  ('mm2','mm2-zombified-rare','Zombified','https://supremevalues.com/media/mm2rares/Zombified.webp','RARE','2/10',2,30,null,'2026-08-24T20:26:24.967Z'),
  ('mm2','mm2-zombified-gun-uncommon','Zombified (Gun)','https://supremevalues.com/media/mm2uncommons/Zombified_Gun.webp','UNCOMMON','2/10',2,15,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombified-knife-uncommon','Zombified (Knife)','https://supremevalues.com/media/mm2uncommons/Zombified_Knife.webp','UNCOMMON','3/10',3,120,null,'2026-08-24T20:26:24.968Z'),
  ('mm2','mm2-zombified-set-set','Zombified Set','https://supremevalues.com/media/mm2uncommons/Zombified_Knife.webp','SET','3/10',3,135,null,'2026-08-24T20:26:24.966Z')
on conflict (game_id,item_id) do update set
  item_name = excluded.item_name,
  image_url = excluded.image_url,
  category = excluded.category,
  demand_label = excluded.demand_label,
  demand_score = excluded.demand_score,
  supreme_value = excluded.supreme_value,
  gcash_value = excluded.gcash_value,
  source_updated_at = excluded.source_updated_at,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Add game identity to shared social / Exchange records.
-- Existing rows are Adopt Me by default for backwards compatibility.
-- -----------------------------------------------------------------------------
alter table public.community_posts add column if not exists game_id text not null default 'adopt-me';
alter table public.community_trades add column if not exists game_id text not null default 'adopt-me';
alter table public.marketplace_listings add column if not exists game_id text not null default 'adopt-me';
alter table public.marketplace_offers add column if not exists game_id text not null default 'adopt-me';
alter table public.trade_rooms add column if not exists game_id text not null default 'adopt-me';
alter table public.marketplace_events add column if not exists game_id text not null default 'adopt-me';

alter table public.community_posts drop constraint if exists community_posts_game_id_check;
alter table public.community_posts add constraint community_posts_game_id_check check (game_id in ('adopt-me','mm2'));
alter table public.community_trades drop constraint if exists community_trades_game_id_check;
alter table public.community_trades add constraint community_trades_game_id_check check (game_id in ('adopt-me','mm2'));
alter table public.marketplace_listings drop constraint if exists marketplace_listings_game_id_check;
alter table public.marketplace_listings add constraint marketplace_listings_game_id_check check (game_id in ('adopt-me','mm2'));
alter table public.marketplace_offers drop constraint if exists marketplace_offers_game_id_check;
alter table public.marketplace_offers add constraint marketplace_offers_game_id_check check (game_id in ('adopt-me','mm2'));
alter table public.trade_rooms drop constraint if exists trade_rooms_game_id_check;
alter table public.trade_rooms add constraint trade_rooms_game_id_check check (game_id in ('adopt-me','mm2'));
alter table public.marketplace_events drop constraint if exists marketplace_events_game_id_check;
alter table public.marketplace_events add constraint marketplace_events_game_id_check check (game_id in ('adopt-me','mm2'));

create index if not exists community_posts_game_channel_created_idx on public.community_posts (game_id,channel_slug,created_at desc);
create index if not exists community_trades_game_created_idx on public.community_trades (game_id,created_at desc);
create index if not exists marketplace_listings_game_status_created_idx on public.marketplace_listings (game_id,status,created_at desc);
create index if not exists marketplace_offers_game_created_idx on public.marketplace_offers (game_id,created_at desc);
create index if not exists trade_rooms_game_updated_idx on public.trade_rooms (game_id,updated_at desc);
create index if not exists marketplace_events_game_created_idx on public.marketplace_events (game_id,created_at desc);
create index if not exists marketplace_events_game_item_idx on public.marketplace_events (game_id,item_id,created_at desc);

-- Value sources are game-specific.
alter table public.community_trades drop constraint if exists community_trades_value_source_check;
alter table public.community_trades add constraint community_trades_value_source_check check (
  (game_id = 'adopt-me' and value_source in ('GCASH','ELVE'))
  or (game_id = 'mm2' and value_source = 'SUPREME')
);
alter table public.marketplace_listings drop constraint if exists marketplace_listings_value_source_check;
alter table public.marketplace_listings add constraint marketplace_listings_value_source_check check (
  (game_id = 'adopt-me' and value_source in ('GCASH','ELVE'))
  or (game_id = 'mm2' and value_source = 'SUPREME')
);
alter table public.marketplace_offers drop constraint if exists marketplace_offers_value_source_check;
alter table public.marketplace_offers add constraint marketplace_offers_value_source_check check (
  (game_id = 'adopt-me' and value_source in ('GCASH','ELVE'))
  or (game_id = 'mm2' and value_source = 'SUPREME')
);

-- -----------------------------------------------------------------------------
-- 3. Game propagation. Older server RPCs/triggers create related records without
-- explicitly passing game_id, so derive it from the parent relationship.
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_sync_offer_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare linked_game text;
begin
  select l.game_id into linked_game from public.marketplace_listings l where l.id = new.listing_id;
  if linked_game is not null then new.game_id := linked_game; end if;
  return new;
end;
$$;
drop trigger if exists marketplace_offers_sync_game on public.marketplace_offers;
create trigger marketplace_offers_sync_game before insert or update of listing_id on public.marketplace_offers
for each row execute function public.marketplace_sync_offer_game();

create or replace function public.marketplace_sync_trade_room_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare linked_game text;
begin
  if new.listing_id is not null then
    select l.game_id into linked_game from public.marketplace_listings l where l.id = new.listing_id;
  end if;
  if linked_game is null and new.accepted_offer_id is not null then
    select o.game_id into linked_game from public.marketplace_offers o where o.id = new.accepted_offer_id;
  end if;
  if linked_game is not null then new.game_id := linked_game; end if;
  return new;
end;
$$;
drop trigger if exists trade_rooms_sync_game on public.trade_rooms;
create trigger trade_rooms_sync_game before insert or update of listing_id,accepted_offer_id on public.trade_rooms
for each row execute function public.marketplace_sync_trade_room_game();

create or replace function public.marketplace_sync_event_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare linked_game text;
declare metadata_game text;
begin
  if new.listing_id is not null then
    select l.game_id into linked_game from public.marketplace_listings l where l.id = new.listing_id;
  end if;
  if linked_game is null and new.offer_id is not null then
    select o.game_id into linked_game from public.marketplace_offers o where o.id = new.offer_id;
  end if;
  if linked_game is null and new.room_id is not null then
    select r.game_id into linked_game from public.trade_rooms r where r.id = new.room_id;
  end if;
  metadata_game := lower(coalesce(new.metadata ->> 'game_id',''));
  if linked_game is null and metadata_game in ('adopt-me','mm2') then linked_game := metadata_game; end if;
  if linked_game is not null then
    new.game_id := linked_game;
  elsif new.game_id not in ('adopt-me','mm2') then
    new.game_id := 'adopt-me';
  end if;
  return new;
end;
$$;
drop trigger if exists marketplace_events_sync_game on public.marketplace_events;
create trigger marketplace_events_sync_game before insert or update of listing_id,offer_id,room_id,metadata on public.marketplace_events
for each row execute function public.marketplace_sync_event_game();

-- -----------------------------------------------------------------------------
-- 4. Lounge counts scoped by game. NULL means all games.
-- -----------------------------------------------------------------------------
create or replace function public.community_channel_counts_by_game(p_game_id text default null)
returns table(channel_slug text, post_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.channel_slug, count(*)::bigint
  from public.community_posts p
  where p_game_id is null or p.game_id = p_game_id
  group by p.channel_slug;
$$;
revoke all on function public.community_channel_counts_by_game(text) from public;
grant execute on function public.community_channel_counts_by_game(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Public event logger understands MM2/SUPREME and preserves the game scope.
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_log_client_event(
  p_fingerprint text,
  p_event_type text,
  p_listing_id uuid default null,
  p_item_id text default null,
  p_value_source text default null,
  p_value numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_type text := upper(coalesce(p_event_type,''));
  normalized_source text := case when upper(coalesce(p_value_source,'')) in ('GCASH','ELVE','SUPREME') then upper(p_value_source) else null end;
  normalized_game text := lower(coalesce(p_metadata ->> 'game_id',''));
  minute_bucket timestamptz := date_trunc('minute',now());
  next_count integer;
  event_limit integer;
begin
  if normalized_type not in ('LISTING_VIEW','SEARCH','MATCH_VIEW','OFFER_BUILDER_OPEN') then return false; end if;
  if char_length(coalesce(p_fingerprint,'')) < 32 then return false; end if;
  if char_length(coalesce(p_item_id,'')) > 180 or char_length(coalesce(p_metadata::text,'')) > 1200 then return false; end if;
  if normalized_type in ('LISTING_VIEW','MATCH_VIEW','OFFER_BUILDER_OPEN') and (p_listing_id is null or not exists (select 1 from public.marketplace_listings l where l.id=p_listing_id)) then return false; end if;

  if p_listing_id is not null then
    select l.game_id into normalized_game from public.marketplace_listings l where l.id = p_listing_id;
  end if;
  if normalized_game not in ('adopt-me','mm2') then normalized_game := 'adopt-me'; end if;
  if normalized_game = 'mm2' and normalized_source is not null and normalized_source <> 'SUPREME' then normalized_source := null; end if;
  if normalized_game = 'adopt-me' and normalized_source = 'SUPREME' then normalized_source := null; end if;

  event_limit := case when normalized_type='SEARCH' then 10 else 40 end;
  insert into public.marketplace_event_rate_limits (fingerprint,bucket,event_type,event_count)
  values (p_fingerprint,minute_bucket,normalized_type,1)
  on conflict (fingerprint,bucket,event_type) do update
  set event_count = public.marketplace_event_rate_limits.event_count + 1
  returning event_count into next_count;
  if next_count > event_limit then return false; end if;

  insert into public.marketplace_events (game_id,event_type,listing_id,item_id,value_source,value,metadata)
  values (normalized_game,normalized_type,p_listing_id,nullif(left(coalesce(p_item_id,''),180),''),normalized_source,p_value,coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('game_id',normalized_game));
  return true;
end;
$$;
revoke all on function public.marketplace_log_client_event(text,text,uuid,text,text,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_log_client_event(text,text,uuid,text,text,numeric,jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- 6. Listing item notification trigger: Adopt inventory/wishlist matching stays
-- Adopt-only; the generic market event is emitted for every game.
-- -----------------------------------------------------------------------------
create or replace function public.notify_marketplace_listing_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_owner uuid;
  listing_status text;
  listing_game text;
  listing_source text;
  matched_user uuid;
  request_count integer;
begin
  select l.user_id, l.status, l.game_id, l.value_source
  into listing_owner, listing_status, listing_game, listing_source
  from public.marketplace_listings l where l.id = new.listing_id;

  if listing_status <> 'OPEN' then return new; end if;

  if listing_game = 'adopt-me' then
    if new.side = 'HAVE' then
      for matched_user in
        select distinct w.user_id from public.wishlist_items w
        where w.item_id = new.item_id
          and w.user_id <> listing_owner
          and not public.marketplace_users_blocked(w.user_id, listing_owner)
        limit 75
      loop
        insert into public.notifications (user_id,type,title,body,href,dedupe_key)
        values (matched_user,'marketplace_match','Wishlist match found',new.item_name || ' was just listed on CSBT Exchange.','/exchange/' || new.listing_id::text,'exchange-listing-' || new.listing_id::text || '-wishlist-' || matched_user::text)
        on conflict (dedupe_key) do nothing;
      end loop;
    elsif new.side = 'WANT' then
      for matched_user in
        select distinct i.user_id from public.inventory_items i
        where i.item_id = new.item_id
          and i.user_id <> listing_owner
          and not public.marketplace_users_blocked(i.user_id, listing_owner)
        limit 75
      loop
        insert into public.notifications (user_id,type,title,body,href,dedupe_key)
        values (matched_user,'marketplace_opportunity','Someone wants an item you own','A new listing is looking for ' || new.item_name || '.','/exchange/' || new.listing_id::text,'exchange-listing-' || new.listing_id::text || '-inventory-' || matched_user::text)
        on conflict (dedupe_key) do nothing;
      end loop;
    end if;
  end if;

  insert into public.marketplace_events (game_id,event_type,listing_id,item_id,value_source,value,metadata)
  values (listing_game,'LISTING_ITEM',new.listing_id,new.item_id,listing_source,new.snapshot_value,jsonb_build_object('side',new.side,'quantity',new.quantity,'value_type',new.value_type,'game_id',listing_game));

  -- Inventory-based demand notifications are an Adopt Me feature. MM2 still
  -- contributes to Exchange market data but never touches Adopt inventory rows.
  if listing_game = 'adopt-me' and new.side = 'WANT' then
    select count(*)::integer into request_count
    from public.marketplace_events e
    where e.game_id = 'adopt-me'
      and e.event_type = 'LISTING_ITEM'
      and e.item_id = new.item_id
      and e.metadata ->> 'side' = 'WANT'
      and e.created_at > now() - interval '24 hours';

    if request_count >= 10 and mod(request_count,10) = 0 then
      for matched_user in
        select distinct i.user_id from public.inventory_items i
        where i.item_id = new.item_id and i.user_id <> listing_owner
        limit 100
      loop
        insert into public.notifications (user_id,type,title,body,href,dedupe_key)
        values (matched_user,'marketplace_demand_spike','Demand spike: '||new.item_name,new.item_name||' is being requested more often on CSBT Exchange today.','/exchange?game=adopt-me&tab=market','exchange-demand-'||new.item_id||'-'||to_char(now(),'YYYYMMDDHH24')||'-'||matched_user::text)
        on conflict (dedupe_key) do nothing;
      end loop;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists marketplace_listing_item_match_notifications on public.marketplace_listing_items;
create trigger marketplace_listing_item_match_notifications after insert on public.marketplace_listing_items
for each row execute function public.notify_marketplace_listing_match();

-- -----------------------------------------------------------------------------
-- 7. Shared listing RPC. New overload adds p_game_id; the old Adopt signature is
-- left in place for backwards compatibility with older clients.
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_create_listing(
  p_game_id text,
  p_value_source text,
  p_intent text,
  p_title text,
  p_note text,
  p_preferences jsonb,
  p_allow_counteroffers boolean,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_listing_id uuid;
  item_row jsonb;
  normalized_game text := lower(coalesce(p_game_id,'adopt-me'));
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_intent text := upper(coalesce(p_intent,'OPEN_OFFERS'));
  normalized_side text;
  normalized_value_type text;
  normalized_potion text;
  canonical_name text;
  canonical_category text;
  canonical_image text;
  canonical_demand text;
  canonical_value numeric;
  have_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to create a listing'; end if;
  if normalized_game not in ('adopt-me','mm2') then raise exception 'Unsupported CSBT game'; end if;
  if normalized_game = 'adopt-me' and normalized_source not in ('GCASH','ELVE') then raise exception 'Invalid Adopt Me value source'; end if;
  if normalized_game = 'mm2' and normalized_source <> 'SUPREME' then raise exception 'MM2 Exchange currently uses Supreme values'; end if;
  if normalized_intent not in ('SPECIFIC','SIMILAR_VALUE','UPGRADE','DOWNGRADE','WISHLIST','OPEN_OFFERS') then raise exception 'Invalid listing intent'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 36 then raise exception 'Listing must contain 1 to 36 item rows'; end if;
  if coalesce(p_title,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' or coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange listings'; end if;

  select count(*) into have_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'HAVE';
  if have_count < 1 then raise exception 'Add at least one item you have'; end if;
  if normalized_intent = 'SPECIFIC' and not exists (select 1 from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'WANT') then raise exception 'Specific listings need at least one wanted item'; end if;

  insert into public.marketplace_listings (game_id,user_id,value_source,intent,title,note,preferences,allow_counteroffers)
  values (normalized_game,auth.uid(),normalized_source,normalized_intent,nullif(left(trim(coalesce(p_title,'')),90),''),nullif(left(trim(coalesce(p_note,'')),600),''),coalesce(p_preferences,'{}'::jsonb),coalesce(p_allow_counteroffers,true))
  returning id into new_listing_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    normalized_potion := upper(coalesce(item_row->>'potion_status','BASE'));
    if normalized_side not in ('HAVE','WANT') then raise exception 'Invalid listing item side'; end if;
    if normalized_game = 'adopt-me' and normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if normalized_game = 'mm2' and normalized_value_type <> 'NORMAL' then raise exception 'MM2 items do not use Adopt Me variants'; end if;
    if normalized_potion not in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE') then normalized_potion := 'BASE'; end if;
    if normalized_game = 'mm2' then normalized_potion := 'BASE'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null; canonical_category := null; canonical_image := null; canonical_demand := null; canonical_value := null;
    if normalized_game = 'adopt-me' then
      select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
      from public.value_history vh
      where vh.item_id = item_row->>'item_id'
        and upper(vh.source) = normalized_source
        and upper(vh.value_type) = normalized_value_type
      order by vh.snapshot_date desc, vh.captured_at desc
      limit 1;
      canonical_image := case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null end;
      canonical_demand := case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end;
    else
      select c.item_name,c.category,c.image_url,c.demand_label,c.supreme_value
      into canonical_name,canonical_category,canonical_image,canonical_demand,canonical_value
      from public.game_catalog_items c
      where c.game_id = 'mm2' and c.item_id = item_row->>'item_id'
      limit 1;
    end if;

    if canonical_name is null then raise exception 'Item % / % is not in the current CSBT % catalog', item_row->>'item_id', normalized_value_type, normalized_game; end if;

    insert into public.marketplace_listing_items (listing_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier)
    values (new_listing_id,normalized_side,item_row->>'item_id',left(canonical_name,120),canonical_image,upper(coalesce(canonical_category,'OTHER')),normalized_value_type,normalized_potion,greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),canonical_value,canonical_demand);
  end loop;

  return new_listing_id;
end;
$$;
grant execute on function public.marketplace_create_listing(text,text,text,text,text,jsonb,boolean,jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Shared offer RPC. Listing game is authoritative; all item/value snapshots
-- are re-resolved on the server for both Adopt Me and MM2.
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_create_offer(
  p_listing_id uuid,
  p_parent_offer_id uuid,
  p_value_source text,
  p_sender_total numeric,
  p_recipient_total numeric,
  p_compatibility_score integer,
  p_explanation jsonb,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_row public.marketplace_listings%rowtype;
  parent_row public.marketplace_offers%rowtype;
  recipient uuid;
  new_offer_id uuid;
  item_row jsonb;
  sender_count integer;
  recipient_count integer;
  normalized_source text := upper(coalesce(p_value_source,'GCASH'));
  normalized_side text;
  normalized_value_type text;
  normalized_potion text;
  canonical_name text;
  canonical_category text;
  canonical_image text;
  canonical_demand text;
  canonical_value numeric;
  server_sender_total numeric := 0;
  server_recipient_total numeric := 0;
  server_value_score integer := 70;
  missing_value_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to send an offer'; end if;
  select * into listing_row from public.marketplace_listings where id = p_listing_id for update;
  if listing_row.id is null or listing_row.status <> 'OPEN' or listing_row.expires_at <= now() then raise exception 'This listing is no longer open'; end if;
  if normalized_source <> listing_row.value_source then raise exception 'Offer value source must match the listing'; end if;
  if listing_row.game_id = 'adopt-me' and normalized_source not in ('GCASH','ELVE') then raise exception 'Invalid Adopt Me value source'; end if;
  if listing_row.game_id = 'mm2' and normalized_source <> 'SUPREME' then raise exception 'MM2 Exchange currently uses Supreme values'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 2 or jsonb_array_length(p_items) > 36 then raise exception 'Offer must contain both sides'; end if;
  if coalesce(p_note,'') ~* '(https?://|www[.]|discord[.]gg|bit[.]ly|tinyurl[.])' then raise exception 'External links are not allowed in Exchange offers'; end if;

  if p_parent_offer_id is null then
    recipient := listing_row.user_id;
  else
    if not listing_row.allow_counteroffers then raise exception 'This listing does not allow counteroffers'; end if;
    select * into parent_row from public.marketplace_offers where id = p_parent_offer_id for update;
    if parent_row.id is null or parent_row.listing_id <> p_listing_id then raise exception 'Counteroffer chain mismatch'; end if;
    if parent_row.recipient_id <> auth.uid() or parent_row.status <> 'PENDING' then raise exception 'The original offer cannot be countered'; end if;
    recipient := parent_row.sender_id;
  end if;

  if recipient = auth.uid() then raise exception 'You cannot offer to yourself'; end if;
  if public.marketplace_users_blocked(auth.uid(),recipient) then raise exception 'This trade is blocked'; end if;

  select count(*) into sender_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'SENDER';
  select count(*) into recipient_count from jsonb_array_elements(p_items) as item_entry where upper(item_entry->>'side') = 'RECIPIENT';
  if sender_count < 1 or recipient_count < 1 then raise exception 'Both sides need at least one item'; end if;

  insert into public.marketplace_offers (game_id,listing_id,sender_id,recipient_id,parent_offer_id,value_source,sender_total,recipient_total,compatibility_score,explanation,note)
  values (listing_row.game_id,p_listing_id,auth.uid(),recipient,p_parent_offer_id,normalized_source,0,0,70,coalesce(p_explanation,'{}'::jsonb),nullif(left(trim(coalesce(p_note,'')),500),''))
  returning id into new_offer_id;

  for item_row in select value from jsonb_array_elements(p_items) as item_entry(value)
  loop
    normalized_side := upper(coalesce(item_row->>'side',''));
    normalized_value_type := upper(coalesce(item_row->>'value_type','NORMAL'));
    normalized_potion := upper(coalesce(item_row->>'potion_status','BASE'));
    if normalized_side not in ('SENDER','RECIPIENT') then raise exception 'Invalid offer item side'; end if;
    if listing_row.game_id = 'adopt-me' and normalized_value_type not in ('NORMAL','NEON','MEGA') then raise exception 'Invalid item variant'; end if;
    if listing_row.game_id = 'mm2' and normalized_value_type <> 'NORMAL' then raise exception 'MM2 items do not use Adopt Me variants'; end if;
    if normalized_potion not in ('BASE','NO_POTION','RIDE','FLY','FLY_RIDE') then normalized_potion := 'BASE'; end if;
    if listing_row.game_id = 'mm2' then normalized_potion := 'BASE'; end if;
    if nullif(trim(coalesce(item_row->>'item_id','')),'') is null then raise exception 'Missing item ID'; end if;

    canonical_name := null; canonical_category := null; canonical_image := null; canonical_demand := null; canonical_value := null;
    if listing_row.game_id = 'adopt-me' then
      select vh.item_name, vh.category, vh.value
      into canonical_name, canonical_category, canonical_value
      from public.value_history vh
      where vh.item_id = item_row->>'item_id'
        and upper(vh.source) = normalized_source
        and upper(vh.value_type) = normalized_value_type
      order by vh.snapshot_date desc, vh.captured_at desc
      limit 1;
      canonical_image := case
        when coalesce(item_row->>'image_url','') ~ '^/images/' then item_row->>'image_url'
        when coalesce(item_row->>'image_url','') ~ '^https://elvebredd[.]com/' then item_row->>'image_url'
        else null end;
      canonical_demand := case when upper(coalesce(item_row->>'demand_tier','')) in ('S','A','B','C','D') then upper(item_row->>'demand_tier') else null end;
    else
      select c.item_name,c.category,c.image_url,c.demand_label,c.supreme_value
      into canonical_name,canonical_category,canonical_image,canonical_demand,canonical_value
      from public.game_catalog_items c
      where c.game_id = 'mm2' and c.item_id = item_row->>'item_id'
      limit 1;
    end if;

    if canonical_name is null then raise exception 'Item % / % is not in the current CSBT % catalog', item_row->>'item_id', normalized_value_type, listing_row.game_id; end if;

    insert into public.marketplace_offer_items (offer_id,side,item_id,item_name,image_url,category,value_type,potion_status,quantity,snapshot_value,demand_tier)
    values (new_offer_id,normalized_side,item_row->>'item_id',left(canonical_name,120),canonical_image,upper(coalesce(canonical_category,'OTHER')),normalized_value_type,normalized_potion,greatest(1,least(99,coalesce((item_row->>'quantity')::integer,1))),canonical_value,canonical_demand);
  end loop;

  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0), (count(*) filter (where snapshot_value is null))::integer
  into server_sender_total, missing_value_count
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'SENDER';
  select coalesce(sum(coalesce(snapshot_value,0) * quantity),0), missing_value_count + (count(*) filter (where snapshot_value is null))::integer
  into server_recipient_total, missing_value_count
  from public.marketplace_offer_items where offer_id = new_offer_id and side = 'RECIPIENT';

  if missing_value_count > 0 then
    server_value_score := null;
  elsif server_recipient_total > 0 then
    server_value_score := greatest(0,least(100,round(100 - (abs(server_sender_total-server_recipient_total) / server_recipient_total) * 100)::integer));
  end if;

  update public.marketplace_offers
  set sender_total = server_sender_total,
      recipient_total = server_recipient_total,
      compatibility_score = server_value_score,
      explanation = coalesce(p_explanation,'{}'::jsonb) || jsonb_build_object(
        'server_validated', true,
        'server_value_score', server_value_score,
        'server_sender_total', server_sender_total,
        'server_recipient_total', server_recipient_total,
        'missing_value_count', missing_value_count,
        'game_id', listing_row.game_id
      )
  where id = new_offer_id;

  if p_parent_offer_id is not null then update public.marketplace_offers set status = 'COUNTERED' where id = p_parent_offer_id; end if;
  return new_offer_id;
end;
$$;
grant execute on function public.marketplace_create_offer(uuid,uuid,text,numeric,numeric,integer,jsonb,text,jsonb) to authenticated;
