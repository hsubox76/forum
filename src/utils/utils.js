import trim from 'lodash/trim';

export function getParams(queryString) {
	if (!queryString) return {};
	return trim(queryString, '?').split('&')
      .reduce((lookup, pairString) => {
        const [key, value] = pairString.split('=');
        lookup[key] = value;
        return lookup;
      }, {});
}

export function getPostRange(page, posts, postIds) {
  let start;
  let end;
  const numPages = Math.ceil(postIds.length / posts);
  if (page === 'last') {
    // get last page
    start = posts * (numPages - 1);
    end = Math.min(posts * numPages, postIds.length);
    page = numPages - 1;
  } else {
    page = parseInt(page, 10);
    start = posts * page;
    end = Math.min(posts * (page + 1), postIds.length);
  }
  return { start, end, page, numPages };
}