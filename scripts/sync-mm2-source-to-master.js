const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const {
  cleanText,
  cleanNumber,
  normalizeName,
  validateSnapshot
} = require("./lib/mm2-source");


const projectRoot = process.cwd();


const workbookPath =
  path.join(
    projectRoot,
    "source-data",
    "mm2-trading-data.xlsx"
  );


const backupPath =
  path.join(
    projectRoot,
    "source-data",
    "mm2-trading-data.backup.xlsx"
  );


const snapshotPath =
  path.join(
    projectRoot,
    "source-data",
    "mm2-source-values.json"
  );



const HEADERS = [

  "ITEM NAME",
  "ITEM IMAGE",
  "TYPE",
  "CATEGORY",
  "CSBT VALUE",
  "SOURCE VALUE",
  "DEMAND",
  "SOURCE NAME",
  "SOURCE URL",
  "GCASH VALUE",
  "NOTES",
  "UPDATED AT",
  "LAST SOURCE SYNC",

];



function normalizeHeader(value){

  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,"");

}



function headerIndex(headers,name){

  const target =
    normalizeHeader(name);


  return headers.findIndex(
    h =>
      normalizeHeader(h) === target
  );

}



function ensureColumns(rows){

  if(!rows.length)
    rows.push([]);


  for(const header of HEADERS){

    if(headerIndex(rows[0],header) === -1){

      rows[0].push(header);

    }

  }


  for(let i=1;i<rows.length;i++){

    while(
      rows[i].length < rows[0].length
    ){

      rows[i].push(null);

    }

  }

}



function itemKey(name,category){

  return (
    `${normalizeName(name)}::${normalizeName(category)}`
  );

}





function dedupeSnapshot(items){

  const map = new Map();


  for(const item of items){

    const key =
      itemKey(
        item.NAME || item.name,
        item.CATEGORY || item.category
      );


    map.set(key,item);

  }


  return [...map.values()];

}





function main(){


  if(!fs.existsSync(workbookPath))
    throw new Error(
      "MM2 workbook missing"
    );


  if(!fs.existsSync(snapshotPath))
    throw new Error(
      "MM2 snapshot missing"
    );



  const snapshot =
    JSON.parse(
      fs.readFileSync(
        snapshotPath,
        "utf8"
      )
    );



  validateSnapshot(snapshot);



  fs.copyFileSync(
    workbookPath,
    backupPath
  );



  const cleanItems =
    dedupeSnapshot(
      snapshot.items
    );



  const workbook =
    XLSX.readFile(
      workbookPath
    );



  const sheet =
    workbook.Sheets.Items ||
    XLSX.utils.aoa_to_sheet(
      [HEADERS]
    );



  const existingRows =
    XLSX.utils.sheet_to_json(
      sheet,
      {
        header:1,
        defval:null
      }
    );



  ensureColumns(existingRows);



  const headers =
    existingRows[0];



  const nameCol =
    headerIndex(headers,"ITEM NAME");

  const imageCol =
    headerIndex(headers,"ITEM IMAGE");

  const typeCol =
    headerIndex(headers,"TYPE");

  const categoryCol =
    headerIndex(headers,"CATEGORY");

  const csbtCol =
    headerIndex(headers,"CSBT VALUE");

  const sourceValueCol =
    headerIndex(headers,"SOURCE VALUE");

  const demandCol =
    headerIndex(headers,"DEMAND");

  const sourceNameCol =
    headerIndex(headers,"SOURCE NAME");

  const sourceUrlCol =
    headerIndex(headers,"SOURCE URL");

  const gcashCol =
    headerIndex(headers,"GCASH VALUE");

  const notesCol =
    headerIndex(headers,"NOTES");

  const updatedCol =
    headerIndex(headers,"UPDATED AT");

  const syncCol =
    headerIndex(headers,"LAST SOURCE SYNC");




  /*
    Save manual edits
  */

  const manual =
    new Map();



  for(let i=1;i<existingRows.length;i++){


    const row =
      existingRows[i];


    const name =
      cleanText(row[nameCol]);


    const category =
      cleanText(row[categoryCol]);



    if(!name || !category)
      continue;



    manual.set(
      itemKey(
        name,
        category
      ),
      {

        csbt:
          row[csbtCol],

        gcash:
          row[gcashCol],

        notes:
          row[notesCol],

      }
    );

  }





  const output =
    [headers];



  let added=0;
  let updated=0;



  for(const item of cleanItems){


    const name =
      cleanText(
        item.NAME ||
        item.name
      );


    const category =
      cleanText(
        item.CATEGORY ||
        item.category
      );



    if(!name || !category)
      continue;



    const row =
      Array(
        headers.length
      )
      .fill(null);



    row[nameCol]=name;

    row[categoryCol]=category.toUpperCase();



    row[imageCol]=
      item.IMAGE || "";



    row[typeCol]=
      item.TYPE || "OTHER";



    row[sourceValueCol]=
      cleanNumber(
        item.SUPREME_VALUE ??
        item.VALUE
      );



    row[demandCol]=
      cleanNumber(
        item.DEMAND
      );



    row[sourceNameCol]="Supreme Values";


    row[sourceUrlCol]=
      item.SOURCE_URL || null;



    row[updatedCol]=
      new Date().toISOString();



    row[syncCol]=
      snapshot.fetchedAt ||
      new Date().toISOString();




    const saved =
      manual.get(
        itemKey(
          name,
          category
        )
      );



    if(saved){

      row[csbtCol]=saved.csbt;

      row[gcashCol]=saved.gcash;

      row[notesCol]=saved.notes;

      updated++;

    }
    else{

      added++;

    }



    output.push(row);

  }




  const rebuilt =
    XLSX.utils.aoa_to_sheet(
      output
    );


  workbook.Sheets.Items =
    rebuilt;



  XLSX.writeFile(
    workbook,
    workbookPath
  );



  console.log(
    `MM2 source sync complete. Added ${added}, updated ${updated}.`
  );

}



main();