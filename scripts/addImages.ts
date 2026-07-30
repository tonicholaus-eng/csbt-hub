import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const filePath = path.join(projectRoot, "src", "data", "pets.json");

type PetRecord = {
  PETS?: unknown;
  IMAGE?: unknown;
  [key: string]: unknown;
};

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function main() {
  if (!fs.existsSync(filePath)) {
    throw new Error(`pets.json not found: ${filePath}`);
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error("src/data/pets.json must contain a JSON array.");
  }

  const updated = parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Row ${index + 1} is not a valid object.`);
    }

    const pet = entry as PetRecord;

    if (typeof pet.PETS !== "string" || !pet.PETS.trim()) {
      throw new Error(`Row ${index + 1} is missing a valid PETS name.`);
    }

    return {
      ...pet,
      IMAGE: `/pets/${slug(pet.PETS)}.webp`,
    };
  });

  fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  console.log(`Added normalized IMAGE fields to ${updated.length} pets.`);
  console.log("Run npm run data:validate next.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}