const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const {
  cleanText,
  cleanNumber,
  createId,
  normalizeName
} = require("./lib/mm2-source");


const projectRoot = process.cwd();


const workbookPath =
  path.join(
    projectRoot,
    "source-data",
    "mm2-trading-data.xlsx"
  );


const itemsPath =
  path.join(
    projectRoot,
    "src",
    "data",
    "mm2Items.json"
  );


const indexPath =
  path.join(
    projectRoot,
    "src",
    "data",
    "mm2ItemsIndex.json"
  );


const metaPath =
  path.join(
    projectRoot,
    "src",
    "data",
    "mm2Meta.json"
  );



function normalizeHeader(value){

  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,"");

}



function normalizeRow(row){

  const output={};


  for(const [key,value] of Object.entries(row)){

    output[
      normalizeHeader(key)
    ] = value;

  }


  return output;

}



function pick(row,name){

  return row[
    normalizeHeader(name)
  ];

}





function readWorkbook(){

  const workbook =
    XLSX.readFile(
      workbookPath
    );


  const sheet =
    workbook.Sheets.Items;


  if(!sheet)
    throw new Error(
      'MM2 workbook requires "Items" sheet'
    );


  return XLSX.utils.sheet_to_json(
    sheet,
    {
      defval:null,
      raw:true
    }
  );

}




function detectDuplicates(items){

  const seen=new Map();


  for(const item of items){

    const key =
      `${normalizeName(item.NAME)}::${item.CATEGORY}`;


    if(seen.has(key)){

      console.log(
        "Duplicate identity detected:",
        key
      );

    }


    seen.set(
      key,
      item
    );

  }

}




function readSourceMeta(){

  try{

    const snapshot =
      JSON.parse(
        fs.readFileSync(
          path.join(
            projectRoot,
            "source-data",
            "mm2-source-values.json"
          ),
          "utf8"
        )
      );


    return {

      sourceName:
        snapshot.source || null,

      sourceFetchedAt:
        snapshot.fetchedAt || null

    };


  }catch{

    return {

      sourceName:null,

      sourceFetchedAt:null

    };

  }

}





function main(){


  if(!fs.existsSync(workbookPath))
    throw new Error(
      "MM2 workbook missing"
    );



  let items =
    readWorkbook()

    .map(normalizeRow)

    .map(row=>{


      const name =
        cleanText(
          pick(row,"ITEM NAME")
        );


      if(!name)
        return null;



      const category =
        cleanText(
          pick(row,"CATEGORY")
        )
        .toUpperCase();



      if(!category)
        return null;




      const csbt =
        cleanNumber(
          pick(row,"CSBT VALUE")
        );


      const source =
        cleanNumber(
          pick(row,"SOURCE VALUE")
        );


      const gcash =
        cleanNumber(
          pick(row,"GCASH VALUE")
        );



      return {

        ID:
          createId(
            name,
            category
          ),


        NAME:name,


        IMAGE:
          cleanText(
            pick(row,"ITEM IMAGE")
          ),


        TYPE:
          cleanText(
            pick(row,"TYPE")
          )
          .toUpperCase()
          ||
          "OTHER",


        CATEGORY:category,


        CSBT_VALUE:csbt,


        SOURCE_VALUE:source,


        GCASH_VALUE:gcash,


        VALUE:
          csbt ??
          gcash ??
          source,


        DEMAND:
          cleanNumber(
            pick(row,"DEMAND")
          ),


        SOURCE_NAME:
          cleanText(
            pick(row,"SOURCE NAME")
          )
          ||
          null,


        SOURCE_URL:
          cleanText(
            pick(row,"SOURCE URL")
          )
          ||
          null,


        NOTES:
          cleanText(
            pick(row,"NOTES")
          )
          ||
          null,


        UPDATED_AT:
          cleanText(
            pick(row,"UPDATED AT")
          )
          ||
          new Date().toISOString(),


        LAST_SOURCE_SYNC:
          cleanText(
            pick(row,"LAST SOURCE SYNC")
          )
          ||
          null

      };


    })

    .filter(Boolean);



  console.log(
    `Exporting ${items.length} MM2 items`
  );



  detectDuplicates(items);



  items.sort(
    (a,b)=>
      a.NAME.localeCompare(
        b.NAME,
        undefined,
        {
          numeric:true,
          sensitivity:"base"
        }
      )
  );




  const categoryCounts={};
  const typeCounts={};



  for(const item of items){

    categoryCounts[item.CATEGORY] =
      (categoryCounts[item.CATEGORY] || 0)+1;


    typeCounts[item.TYPE] =
      (typeCounts[item.TYPE] || 0)+1;

  }



  const meta = {

    schemaVersion:1,

    totalItems:items.length,

    categoryCounts,

    typeCounts,

    generatedAt:
      new Date().toISOString(),

    ...readSourceMeta()

  };



  const index =
    items.map(item=>({

      ID:item.ID,

      NAME:item.NAME,

      IMAGE:item.IMAGE,

      TYPE:item.TYPE,

      CATEGORY:item.CATEGORY,

      VALUE:item.VALUE,

      GCASH_VALUE:item.GCASH_VALUE,

      DEMAND:item.DEMAND

    }));



  fs.writeFileSync(
    itemsPath,
    JSON.stringify(
      items,
      null,
      2
    )+"\n"
  );


  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      index,
      null,
      2
    )+"\n"
  );


  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      meta,
      null,
      2
    )+"\n"
  );



  console.log(
    "MM2 JSON generation complete."
  );

}



main();