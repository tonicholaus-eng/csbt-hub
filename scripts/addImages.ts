import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "src", "data", "pets.json");

const pets = JSON.parse(fs.readFileSync(file, "utf8"));

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const updated = pets.map((pet: any) => ({
  ...pet,
  IMAGE: `/pets/${slug(pet.PETS)}.webp`,
}));

fs.writeFileSync(file, JSON.stringify(updated, null, 2));

console.log("✅ Added IMAGE field to", updated.length, "pets.");