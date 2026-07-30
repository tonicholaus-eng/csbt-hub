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

await page.screenshot({
  path: "abyssinian-test.png",
  fullPage: true,
});

  // Wait until at least one Adopt Me image appears
  await page
    .waitForFunction(() => {
      return [...document.images].some((img) =>
        img.src.includes("static.wikia.nocookie.net/adoptme")
      );
    }, { timeout: 15000 })
    .catch(() => {});

  const images = await page.evaluate(() => {
    return [...document.images].map((img) => img.src);
  });

  console.log("All images found:");
  console.log(images);

  const image = images.find((src) =>
    src.includes("static.wikia.nocookie.net/adoptme")
  );

  console.log("Image URL:", image);

  return image || null;
}
(async () => {
const context = await chromium.launchPersistentContext(
  "C:\\Users\\me\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1",
  {
    headless: false,
    channel: "chrome",
    viewport: {
      width: 1400,
      height: 900,
    },
  }
);

const page = context.pages()[0] || await context.newPage();

 for (let i = 4; i < 5; i++) {
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

 await context.close();

  console.log("\n🎉 Finished!");
})();