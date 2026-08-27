// CSBT HUB MM2 Supreme importer
// Supreme values source importer
// Cleans category conflicts before creating master source data

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");

const SOURCE_OUT = path.join(
  ROOT,
  "source-data",
  "mm2-source-values.json"
);

const ITEMS_OUT = path.join(
  ROOT,
  "src",
  "data",
  "mm2Items.json"
);

const BASE = "https://supremevalues.com";


const CATEGORIES = [
  ["sets", "Set"],
  ["uniques", "Unique"],
  ["evos", "Evo"],
  ["ancients", "Ancient"],
  ["vintages", "Vintage"],
  ["chromas", "Chroma"],
  ["godlies", "Godly"],
  ["legendaries", "Legendary"],
  ["rares", "Rare"],
  ["uncommons", "Uncommon"],
  ["commons", "Common"],
  ["pets", "Pet"],
  ["misc", "Misc"],
  ["untradables", "Untradable"],
];



function num(value){

  if(value === null || value === undefined || value === "")
    return null;


  const result =
    Number(
      String(value)
      .replace(/[^0-9.-]/g,"")
    );


  return Number.isNaN(result)
    ? null
    : result;

}



function normalizeName(value){

  return String(value || "")
    .replace(/&amp;/g,"&")
    .replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"')
    .replace(/\s+/g," ")
    .trim()
    .toLowerCase();

}




function extractPopup(html){

  const match =
    html.match(
      /var\s+_svPopup\s*=\s*(\{[\s\S]*?\});/
    );


  if(!match)
    return null;


  return JSON.parse(
    match[1]
      .replace(/\\'/g,"'")
      .replace(/\\u0027/g,"'")
      .replace(/\\\//g,"/")
  );

}




function extractHtmlCards(html,category){

  const items=[];


  const regex =
    /<div class="itemcolumn"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<div class="itemhead">(.*?)<\/div>[\s\S]*?<div class="itembody">([\s\S]*?)<\/div>[\s\S]*?<\/div>\s*<\/div>/g;



  let match;


  while((match = regex.exec(html)) !== null){

    const image = match[1];


    const name =
      match[2]
      .replace(/<[^>]+>/g,"")
      .trim();


    if(!name)
      continue;



    items.push({

      NAME:name,

      CATEGORY:category,

      IMAGE:image,

      SUPREME_VALUE:null,

      DEMAND:null,

      SOURCE:"Supreme Values",

      UPDATED_AT:new Date().toISOString()

    });

  }


  return items;

}





function convert(data,category){

  return Object.entries(data).map(([name,item])=>({

    NAME:name,

    CATEGORY:category,

    SUPREME_VALUE:
      item.rawValue ?? num(item.value),

    DEMAND:
      num(item.demand),

    IMAGE:
      item.imageKey || "",

    SOURCE:"Supreme Values",

    UPDATED_AT:
      new Date().toISOString()

  }));

}






function buildVisibleCardMap(cards){

  const map=new Map();


  for(const card of cards){

    const key =
      normalizeName(card.NAME);


    if(!map.has(key))
      map.set(key,[]);


    map.get(key).push(card);

  }


  return map;

}





function mergePopupWithVisibleCards(
  popupItems,
  visibleMap,
  category
){

  const merged=[];


  for(const item of popupItems){

    const key =
      normalizeName(item.NAME);


    const cards =
      visibleMap.get(key);



    if(!cards)
      continue;



    for(const card of cards){

      merged.push({

        ...item,

        CATEGORY:category,

        IMAGE:
          card.IMAGE ||
          item.IMAGE ||
          "",

        UPDATED_AT:
          new Date().toISOString()

      });

    }

  }


  return merged;

}





/*
 CATEGORY PRIORITY

 Used only when Supreme exposes
 impossible duplicate identities.

*/

const CATEGORY_PRIORITY = {

  ANCIENT:1,

  CHROMA:2,

  GODLY:3,

  VINTAGE:4,

  LEGENDARY:5,

  RARE:6,

  UNCOMMON:7,

  COMMON:8,

  SET:9,

  EVO:10,

  PET:11,

  MISC:12,

  UNTRADABLE:13,

  UNIQUE:14

};





function resolveCategoryConflicts(items){

  const groups = new Map();



  for(const item of items){

    const key =
      normalizeName(item.NAME);


    if(!groups.has(key))
      groups.set(key,[]);


    groups.get(key).push(item);

  }



  const output=[];



  for(const [name,group] of groups){


    const categories =
      [...new Set(
        group.map(
          item=>item.CATEGORY.toUpperCase()
        )
      )];



    if(categories.length === 1){

      output.push(group[0]);

      continue;

    }




    console.log(
      "\nResolving duplicate:",
      name
    );



    group.sort((a,b)=>{

      return (
        CATEGORY_PRIORITY[a.CATEGORY.toUpperCase()] -
        CATEGORY_PRIORITY[b.CATEGORY.toUpperCase()]
      );

    });



    const keep =
      group[0];



    console.log(
      "KEEP:",
      keep.CATEGORY,
      keep.SUPREME_VALUE
    );



    for(const removed of group.slice(1)){

      console.log(
        "REMOVE:",
        removed.CATEGORY,
        removed.SUPREME_VALUE
      );

    }



    output.push(keep);

  }



  return output;

}







function dedupe(items){

  const map=new Map();


  for(const item of items){

    const key =
      `${normalizeName(item.NAME)}::${item.CATEGORY}`;


    map.set(key,item);

  }


  return [...map.values()];

}







async function main(){


  const browser =
    await chromium.launch({
      headless:false
    });



  const page =
    await browser.newPage();



  let all=[];



  for(const [slug,category] of CATEGORIES){


    console.log(
      `Fetching ${category}: ${BASE}/mm2/${slug}`
    );



    try{


      await page.goto(
        `${BASE}/mm2/${slug}`,
        {
          waitUntil:"domcontentloaded",
          timeout:90000
        }
      );


      await page.waitForTimeout(3000);



      const html =
        await page.content();



      const cards =
        extractHtmlCards(
          html,
          category
        );


      const map =
        buildVisibleCardMap(cards);



      const popup =
        extractPopup(html);



      let items=[];



      if(popup){

        items =
          mergePopupWithVisibleCards(
            convert(
              popup,
              category
            ),
            map,
            category
          );

      }



      if(items.length===0){

        items=cards;

      }



      console.log(
        `Collected ${items.length} ${category} items`
      );


      all.push(...items);



    }catch(error){

      console.log(
        `Failed ${category}: ${error.message}`
      );

    }

  }



  all =
    resolveCategoryConflicts(all);



  all =
    dedupe(all);



  fs.mkdirSync(
    path.dirname(SOURCE_OUT),
    {
      recursive:true
    }
  );



  fs.mkdirSync(
    path.dirname(ITEMS_OUT),
    {
      recursive:true
    }
  );



  fs.writeFileSync(
    SOURCE_OUT,
    JSON.stringify(
      {
        source:"Supreme Values",
        fetchedAt:new Date().toISOString(),
        items:all
      },
      null,
      2
    )
  );



  fs.writeFileSync(
    ITEMS_OUT,
    JSON.stringify(
      all,
      null,
      2
    )
  );



  await browser.close();



  console.log(
    `Imported ${all.length} MM2 items.`
  );

}



main();