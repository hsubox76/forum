import React from 'react';
import range from "lodash/range";
import { Link } from "@reach/router";

export default function PaginationControl({ linkRoot, type, numPages, itemsPerPage, page}) {
  return (
    <div className="flex bg-main rounded text-white p-1 items-center">
      <span className="mx-2">page</span>
      {range(numPages).map((pageNum) => {
        const pageLink =
          linkRoot +
          `?page=${pageNum}&${type}s=${itemsPerPage}`;
        const classes = ["px-1"];
        if (pageNum === page) {
          classes.push("border");
        }
        return (
          <Link
            key={"page-" + pageNum}
            className={classes.join(" ")}
            to={pageLink}
          >
            {pageNum}
          </Link>
        );
      })}
    </div>
  );
}