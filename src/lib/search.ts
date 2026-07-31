import tradingItems from "../data/tradingItems.json";

import {
  TradeItem,
} from "../components/trade/types";


function normalize(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9\s]/g,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    );
}


const itemList = Array.from(
  new Map(
    (tradingItems as TradeItem[]).map(
      (item) => [
        normalize(item.NAME),
        item,
      ],
    ),
  ).values(),
);



function getLevenshteinDistance(
  first: string,
  second: string,
): number {

  const rows =
    second.length + 1;

  const columns =
    first.length + 1;


  const matrix =
    Array.from(
      {
        length: rows,
      },
      () =>
        Array<number>(
          columns,
        ).fill(0),
    );


  for (
    let column = 0;
    column < columns;
    column++
  ) {
    matrix[0][column] =
      column;
  }


  for (
    let row = 0;
    row < rows;
    row++
  ) {
    matrix[row][0] =
      row;
  }


  for (
    let row = 1;
    row < rows;
    row++
  ) {

    for (
      let column = 1;
      column < columns;
      column++
    ) {

      const cost =
        second[row - 1] ===
        first[column - 1]
          ? 0
          : 1;


      matrix[row][column] =
        Math.min(
          matrix[row - 1][column] + 1,
          matrix[row][column - 1] + 1,
          matrix[row - 1][column - 1] +
            cost,
        );
    }
  }


  return matrix[rows - 1][columns - 1];
}



function getSimilarity(
  first: string,
  second: string,
): number {

  if (
    !first.length &&
    !second.length
  ) {
    return 1;
  }


  const longest =
    Math.max(
      first.length,
      second.length,
    );


  if (!longest) {
    return 1;
  }


  const distance =
    getLevenshteinDistance(
      first,
      second,
    );


  return (
    1 -
    distance / longest
  );
}



function getSearchScore(
  name: string,
  query: string,
): number {

  const itemName =
    normalize(name);

  const search =
    normalize(query);


  if (!search) {
    return 0;
  }


  if (
    itemName === search
  ) {
    return 1000;
  }


  if (
    itemName.startsWith(search)
  ) {
    return (
      900 -
      (
        itemName.length -
        search.length
      )
    );
  }


  const words =
    itemName.split(" ");


  const wordMatch =
    words.findIndex(
      (word) =>
        word.startsWith(search),
    );


  if (
    wordMatch !== -1
  ) {
    return (
      800 -
      wordMatch * 10
    );
  }


  const included =
    itemName.indexOf(search);


  if (
    included !== -1
  ) {
    return (
      700 -
      included
    );
  }


  const similarity =
    Math.max(
      ...words.map(
        (word) =>
          getSimilarity(
            word,
            search,
          ),
      ),
    );


  const fullSimilarity =
    getSimilarity(
      itemName,
      search,
    );


  const best =
    Math.max(
      similarity,
      fullSimilarity,
    );


  if (
    best >= 0.72
  ) {
    return Math.round(
      best * 600,
    );
  }


  return 0;
}



export function searchItems(
  query: string,
): TradeItem[] {

  const normalized =
    normalize(query);


  if (!normalized) {
    return [];
  }


  return itemList
    .map(
      (item) => ({
        item,
        score:
          getSearchScore(
            item.NAME,
            query,
          ),
      }),
    )
    .filter(
      (result) =>
        result.score > 0,
    )
    .sort(
      (
        a,
        b,
      ) => {

        if (
          b.score !==
          a.score
        ) {
          return (
            b.score -
            a.score
          );
        }


        return (
          a.item.NAME.localeCompare(
            b.item.NAME,
          )
        );
      },
    )
    .slice(
      0,
      8,
    )
    .map(
      (result) =>
        result.item,
    );
}



export function getItem(
  name: string,
): TradeItem | undefined {

  const normalized =
    normalize(name);


  return itemList.find(
    (item) =>
      normalize(
        item.NAME,
      ) === normalized,
  );
}


/*
  Compatibility exports.
  These keep your old components working
  while we migrate the rest of the website.
*/

export function searchPets(
  query: string,
): TradeItem[] {
  return searchItems(query);
}


export function getPet(
  name: string,
): TradeItem | undefined {
  return getItem(name);
}


export {
  itemList,
};