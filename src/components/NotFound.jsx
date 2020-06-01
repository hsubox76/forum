import React from "react";
import { Link } from "@reach/router";

const NotFound = (props) => (
  <div className="container flex mx-auto items-center justify-center my-20">
    <div>Page "{props.location.href}" not found.</div>
    <div>
      <Link to="/">Back to top.</Link>
    </div>
  </div>
);

export default NotFound;
