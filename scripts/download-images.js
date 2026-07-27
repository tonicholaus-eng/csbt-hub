console.log("RUNNING NEW SCRIPT");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const https = require("https");

const pets = require("../src/data/pets.json");

const SAVE_DIR = path.join(__dirname, "../public/pets");

if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(page, imageUrl, destination) {
  const response = await page.goto(imageUrl, {
    waitUntil: "load",
    timeout: 120000,
  });

  if (!response) {
    throw new Error("No response");
  }

  const buffer = await response.body();

  fs.writeFileSync(destination, buffer);
}
      async function getImageUrl(page, petName) {
  const url =
    "https://adoptme.fandom.com/wiki/" +
    encodeURIComponent(petName.replace(/\s+/g, "_"));

await page.goto(url, {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});

await page.waitForTimeout(5000);

const image = await page.evaluate(() => {
  const selectors = [
    ".pi-image-thumbnail",
    ".image img",
    ".portable-infobox img",
    ".mw-parser-output img"
  ];

  for (const selector of selectors) {
    const img = document.querySelector(selector);
    if (img && img.src) {
      return img.src;
    }
  }

  return null;
});

console.log("Image URL:", image);

if (!image) return null;

return image.split("/revision")[0];
}(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage({
    viewport: {
      width: 1400,
      height: 900,
    },
  });

 for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];

    const filename = pet.IMAGE.replace("/pets/", "");
    const output = path.join(SAVE_DIR, filename);

    if (fs.existsSync(output)) {
      console.log(`✅ [${i + 1}/${pets.length}] ${pet.PETS} (exists)`);
      continue;
    }

    console.log(`\n[${i + 1}/${pets.length}] ${pet.PETS}`);

    try {
      const image = await getImageUrl(page, pet.PETS);

      if (!image) {
        console.log("❌ No image found");
        continue;
      }

      console.log("⬇ Downloading...");

     await downloadImage(page, image, output);

      console.log("✅ Saved");

      await sleep(1000);

    } catch (err) {
      console.log("❌ Failed:", err.message);
    }
  }

  await browser.close();

  console.log("\n🎉 Finished!");
})();