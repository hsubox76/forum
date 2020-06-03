import trim from "lodash/trim";

export function getParams(
  queryString: string | undefined
): { [key: string]: any } {
  if (!queryString) return {};
  return trim(queryString, "?")
    .split("&")
    .reduce((lookup: { [key: string]: any }, pairString) => {
      const [key, value] = pairString.split("=");
      lookup[key] = value;
      return lookup;
    }, {});
}

export function getPostRange(page: string, posts: number, postCount: number) {
  let start;
  let end;
  const numPages = Math.ceil(postCount / posts);
  let pageNum = 0;
  if (page === "last") {
    // get last page
    start = posts * (numPages - 1);
    end = Math.min(posts * numPages, postCount);
    pageNum = numPages - 1;
  } else {
    pageNum = parseInt(page, 10);
    start = posts * pageNum;
    end = Math.min(posts * (pageNum + 1), postCount);
  }
  return { start, end, page: pageNum, numPages };
}
