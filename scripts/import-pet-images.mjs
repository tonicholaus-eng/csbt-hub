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

const valueFields = ["NORMAL", "NEON", "MEGA"];

const acceptedSpecialValues = new Set([
  "n/a",
  "na",
  "trash",
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

function normalizeValueForValidation(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/['’‘`]/g, "-")
    .replace(/\s+/g, "")
    .replace(/\.+$/g, "");
}

function isValidTradeValue(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const normalizedValue =
    normalizeValueForValidation(value);

  if (!normalizedValue) {
    return false;
  }

  if (acceptedSpecialValues.has(normalizedValue)) {
    return true;
  }

  if (/^\d+(?:\.\d+)?\+$/.test(normalizedValue)) {
    return true;
  }

  return (
    /^\d+(?:\.\d+)?$/.test(normalizedValue) ||
    /^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/.test(
      normalizedValue,
    )
  );
}

function isValidImagePath(value) {
  return (
    typeof value === "string" &&
    /^\/pets\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(
      value.trim(),
    )
  );
}

function validatePets(pets) {
  const errors = [];
  const warnings = [];
  const namesByNormalizedName = new Map();
  const imageOwners = new Map();

  pets.forEach((pet, index) => {
    const row = index + 1;

    if (
      !pet ||
      typeof pet !== "object" ||
      Array.isArray(pet)
    ) {
      errors.push({
        type: "invalid-record",
        row,
        message: "Pet record must be an object.",
      });

      return;
    }

    if (
      typeof pet.PETS !== "string" ||
      !pet.PETS.trim()
    ) {
      errors.push({
        type: "missing-pet-name",
        row,
        message:
          "PETS must contain a non-empty pet name.",
      });
    } else {
      pet.PETS = pet.PETS.trim();

      const normalizedPetName = normalizeName(
        pet.PETS,
      );

      const existingNames =
        namesByNormalizedName.get(
          normalizedPetName,
        ) ?? [];

      existingNames.push({
        row,
        name: pet.PETS,
      });

      namesByNormalizedName.set(
        normalizedPetName,
        existingNames,
      );
    }

    for (const field of valueFields) {
      if (!(field in pet)) {
        errors.push({
          type: "missing-value-field",
          row,
          pet: pet.PETS ?? null,
          field,
          message: `${field} is missing.`,
        });

        continue;
      }

      if (!isValidTradeValue(pet[field])) {
        errors.push({
          type: "invalid-value",
          row,
          pet: pet.PETS ?? null,
          field,
          value: pet[field] ?? null,
          message:
            `${field} must be a number, numeric range, ` +
            `open-ended value, or accepted special value. ` +
            `Examples: "125", "125-150", "1400+", ` +
            `"N/A", or "trash".`,
        });

        continue;
      }

      if (typeof pet[field] === "string") {
        pet[field] = pet[field].trim();
      }
    }

    if (!("IMAGE" in pet)) {
      warnings.push({
        type: "missing-image-field",
        row,
        pet: pet.PETS ?? null,
        message:
          "IMAGE is missing and will be generated from the pet name.",
      });

      return;
    }

    if (!isValidImagePath(pet.IMAGE)) {
      errors.push({
        type: "invalid-image-path",
        row,
        pet: pet.PETS ?? null,
        value: pet.IMAGE ?? null,
        message:
          'IMAGE must use the format "/pets/pet-name.webp".',
      });

      return;
    }

    pet.IMAGE = pet.IMAGE.trim();

    const owners =
      imageOwners.get(pet.IMAGE) ?? [];

    owners.push({
      row,
      pet: pet.PETS ?? null,
    });

    imageOwners.set(pet.IMAGE, owners);
  });

  for (
    const [
      normalizedName,
      records,
    ] of namesByNormalizedName
  ) {
    if (records.length <= 1) {
      continue;
    }

    errors.push({
      type: "duplicate-pet-name",
      normalizedName,
      records,
      message: `Duplicate pet name found: ${records
        .map((record) => record.name)
        .join(", ")}.`,
    });
  }

  for (
    const [imagePath, owners] of imageOwners
  ) {
    if (owners.length <= 1) {
      continue;
    }

    warnings.push({
      type: "shared-image-path",
      imagePath,
      owners,
      message:
        `Multiple pet records use ${imagePath}.`,
    });
  }

  return {
    errors,
    warnings,
  };
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
    const fullPath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      const nestedFiles =
        await collectImageFiles(fullPath);

      files.push(...nestedFiles);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path
      .extname(entry.name)
      .toLowerCase();

    if (supportedExtensions.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readPets() {
  const rawJson = await fs.readFile(
    petsJsonPath,
    "utf8",
  );

  const parsed = JSON.parse(rawJson);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "src/data/pets.json must contain a JSON array.",
    );
  }

  return parsed;
}

async function convertImage(
  sourcePath,
  destinationPath,
) {
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

async function writeReport(report) {
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
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

  const pets = await readPets();
  const validation = validatePets(pets);

  console.log(`Pets in JSON: ${pets.length}`);

  console.log(
    `Data errors: ${validation.errors.length}`,
  );

  console.log(
    `Data warnings: ${validation.warnings.length}`,
  );

  console.log("");

  if (validation.errors.length > 0) {
    await writeReport({
      generatedAt: new Date().toISOString(),
      sourceDirectory,
      outputDirectory,
      status: "validation-failed",
      totals: {
        petsInJson: pets.length,
        dataErrors: validation.errors.length,
        dataWarnings:
          validation.warnings.length,
        sourceImagesFound: 0,
        imagesImported: 0,
        petsMissingImages: 0,
        unmatchedImages: 0,
        duplicateImageNames: 0,
        failedImages: 0,
      },
      validation,
      imported: [],
      missingPetImages: [],
      unmatchedImages: [],
      duplicateImages: [],
      failedImages: [],
    });

    console.error(
      "Pet data validation failed. No images or JSON files were changed.",
    );

    console.error(
      `Review ${path.relative(
        projectRoot,
        reportPath,
      )} for exact errors.`,
    );

    process.exitCode = 1;
    return;
  }

  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  const imageFiles =
    await collectImageFiles(sourceDirectory);

  console.log(
    `Images found: ${imageFiles.length}`,
  );

  console.log("");

  const petsByNormalizedName = new Map();

  for (const pet of pets) {
    const normalizedPetName = normalizeName(
      pet.PETS,
    );

    if (
      !petsByNormalizedName.has(
        normalizedPetName,
      )
    ) {
      petsByNormalizedName.set(
        normalizedPetName,
        [],
      );
    }

    petsByNormalizedName
      .get(normalizedPetName)
      .push(pet);
  }

  const imagesByNormalizedName = new Map();

  for (const imagePath of imageFiles) {
    const extension = path.extname(imagePath);

    const originalBaseName = path.basename(
      imagePath,
      extension,
    );

    const normalizedImageName =
      normalizeName(originalBaseName);

    if (
      !imagesByNormalizedName.has(
        normalizedImageName,
      )
    ) {
      imagesByNormalizedName.set(
        normalizedImageName,
        [],
      );
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

  for (
    const [
      normalizedName,
      sourcePaths,
    ] of imagesByNormalizedName
  ) {
    currentIndex += 1;

    const matchingPets =
      petsByNormalizedName.get(
        normalizedName,
      ) ?? [];

    if (sourcePaths.length > 1) {
      duplicateImages.push({
        normalizedName,
        files: sourcePaths.map(
          (filePath) =>
            path.relative(
              projectRoot,
              filePath,
            ),
        ),
      });
    }

    if (matchingPets.length === 0) {
      unmatchedImages.push({
        normalizedName,
        file: path.relative(
          projectRoot,
          sourcePaths[0],
        ),
      });

      continue;
    }

    const selectedSourcePath =
      sourcePaths[0];

    const outputFilename =
      `${normalizedName}.webp`;

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

      await convertImage(
        selectedSourcePath,
        outputPath,
      );

      for (const pet of matchingPets) {
        pet.IMAGE =
          `/pets/${outputFilename}`;
      }

      imported.push({
        petNames: matchingPets.map(
          (pet) => pet.PETS,
        ),
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
    const normalizedPetName = normalizeName(
      pet.PETS,
    );

    const expectedFilename =
      `${normalizedPetName}.webp`;

    const expectedPath = path.join(
      outputDirectory,
      expectedFilename,
    );

    if (!(await pathExists(expectedPath))) {
      missingPetImages.push({
        pet: pet.PETS,
        expectedImage:
          `/pets/${expectedFilename}`,
      });
    } else {
      pet.IMAGE =
        `/pets/${expectedFilename}`;
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
    status: "complete",
    totals: {
      petsInJson: pets.length,
      dataErrors: validation.errors.length,
      dataWarnings:
        validation.warnings.length,
      sourceImagesFound: imageFiles.length,
      imagesImported: imported.length,
      petsMissingImages:
        missingPetImages.length,
      unmatchedImages:
        unmatchedImages.length,
      duplicateImageNames:
        duplicateImages.length,
      failedImages: failedImages.length,
    },
    validation,
    imported,
    missingPetImages,
    unmatchedImages,
    duplicateImages,
    failedImages,
  };

  await writeReport(report);

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

  console.log(
    `Failed images: ${failedImages.length}`,
  );

  console.log(
    `Data warnings: ${validation.warnings.length}`,
  );

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
    error instanceof Error
      ? error.message
      : error,
  );

  console.error("");

  process.exitCode = 1;
});