import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const projectRoot = process.cwd();

const sourceDirectory = path.join(
  projectRoot,
  "incoming-pet-images",
);

const outputDirectory = path.join(
  projectRoot,
  "public",
  "pets",
);

const petsJsonPath = path.join(
  projectRoot,
  "src",
  "data",
  "pets.json",
);

const reportPath = path.join(
  projectRoot,
  "pet-image-import-report.json",
);

const supportedExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
]);

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’‘`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectImageFiles(directory) {
  const files = [];
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await collectImageFiles(fullPath);
      files.push(...nestedFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (supportedExtensions.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readPets() {
  const rawJson = await fs.readFile(petsJsonPath, "utf8");
  const parsed = JSON.parse(rawJson);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "src/data/pets.json must contain a JSON array.",
    );
  }

  return parsed;
}

async function convertImage(sourcePath, destinationPath) {
  await sharp(sourcePath, {
    animated: true,
  })
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 88,
      alphaQuality: 100,
      effort: 4,
    })
    .toFile(destinationPath);
}

async function main() {
  console.log("");
  console.log("CSBT HUB Pet Image Importer");
  console.log("---------------------------");
  console.log("");

  if (!(await pathExists(sourceDirectory))) {
    throw new Error(
      `Source folder not found:\n${sourceDirectory}`,
    );
  }

  if (!(await pathExists(petsJsonPath))) {
    throw new Error(
      `pets.json not found:\n${petsJsonPath}`,
    );
  }

  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  const pets = await readPets();
  const imageFiles = await collectImageFiles(sourceDirectory);

  console.log(`Pets in JSON: ${pets.length}`);
  console.log(`Images found: ${imageFiles.length}`);
  console.log("");

  const petsByNormalizedName = new Map();

  for (const pet of pets) {
    if (!pet?.PETS || typeof pet.PETS !== "string") {
      continue;
    }

    const normalizedPetName = normalizeName(pet.PETS);

    if (!petsByNormalizedName.has(normalizedPetName)) {
      petsByNormalizedName.set(normalizedPetName, []);
    }

    petsByNormalizedName.get(normalizedPetName).push(pet);
  }

  const imagesByNormalizedName = new Map();

  for (const imagePath of imageFiles) {
    const extension = path.extname(imagePath);
    const originalBaseName = path.basename(imagePath, extension);
    const normalizedImageName = normalizeName(originalBaseName);

    if (!imagesByNormalizedName.has(normalizedImageName)) {
      imagesByNormalizedName.set(normalizedImageName, []);
    }

    imagesByNormalizedName
      .get(normalizedImageName)
      .push(imagePath);
  }

  const imported = [];
  const duplicateImages = [];
  const unmatchedImages = [];
  const failedImages = [];
  const missingPetImages = [];

  let currentIndex = 0;

  for (const [normalizedName, sourcePaths] of imagesByNormalizedName) {
    currentIndex += 1;

    const matchingPets =
      petsByNormalizedName.get(normalizedName) ?? [];

    if (sourcePaths.length > 1) {
      duplicateImages.push({
        normalizedName,
        files: sourcePaths.map((filePath) =>
          path.relative(projectRoot, filePath),
        ),
      });
    }

    if (matchingPets.length === 0) {
      unmatchedImages.push({
        normalizedName,
        file: path.relative(projectRoot, sourcePaths[0]),
      });

      continue;
    }

    const selectedSourcePath = sourcePaths[0];
    const outputFilename = `${normalizedName}.webp`;
    const outputPath = path.join(
      outputDirectory,
      outputFilename,
    );

    try {
      console.log(
        `[${currentIndex}/${imagesByNormalizedName.size}] ${path.basename(
          selectedSourcePath,
        )}`,
      );

      await convertImage(selectedSourcePath, outputPath);

      for (const pet of matchingPets) {
        pet.IMAGE = `/pets/${outputFilename}`;
      }

      imported.push({
        petNames: matchingPets.map((pet) => pet.PETS),
        source: path.relative(
          projectRoot,
          selectedSourcePath,
        ),
        output: `/pets/${outputFilename}`,
      });
    } catch (error) {
      failedImages.push({
        source: path.relative(
          projectRoot,
          selectedSourcePath,
        ),
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  for (const pet of pets) {
    if (!pet?.PETS || typeof pet.PETS !== "string") {
      continue;
    }

    const normalizedPetName = normalizeName(pet.PETS);
    const expectedFilename = `${normalizedPetName}.webp`;
    const expectedPath = path.join(
      outputDirectory,
      expectedFilename,
    );

    if (!(await pathExists(expectedPath))) {
      missingPetImages.push({
        pet: pet.PETS,
        expectedImage: `/pets/${expectedFilename}`,
      });
    } else {
      pet.IMAGE = `/pets/${expectedFilename}`;
    }
  }

  await fs.writeFile(
    petsJsonPath,
    `${JSON.stringify(pets, null, 2)}\n`,
    "utf8",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDirectory,
    outputDirectory,
    totals: {
      petsInJson: pets.length,
      sourceImagesFound: imageFiles.length,
      imagesImported: imported.length,
      petsMissingImages: missingPetImages.length,
      unmatchedImages: unmatchedImages.length,
      duplicateImageNames: duplicateImages.length,
      failedImages: failedImages.length,
    },
    imported,
    missingPetImages,
    unmatchedImages,
    duplicateImages,
    failedImages,
  };

  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log("Import complete.");
  console.log("");
  console.log(`Imported: ${imported.length}`);
  console.log(
    `Pets missing images: ${missingPetImages.length}`,
  );
  console.log(
    `Unmatched images: ${unmatchedImages.length}`,
  );
  console.log(
    `Duplicate image names: ${duplicateImages.length}`,
  );
  console.log(`Failed images: ${failedImages.length}`);
  console.log("");
  console.log(
    `Images saved to: ${path.relative(
      projectRoot,
      outputDirectory,
    )}`,
  );
  console.log(
    `Report saved to: ${path.relative(
      projectRoot,
      reportPath,
    )}`,
  );
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("Import failed:");
  console.error(
    error instanceof Error ? error.message : error,
  );
  console.error("");

  process.exitCode = 1;
});