import React from "react";
import { Link } from "@reach/router";

const NotFound = props => (
  <div className="page-message-container">
    <div>Page "{props.location.href}" not found.</div>
    <div>
      <Link to="/">Back to top.</Link>
    </div>
  </div>
);

export default NotFound;
