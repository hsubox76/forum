import React from "react";
import { Link } from "@reach/router";

function UserData(props) {
  if (props.user) {
    return (
      <Link className="user-name-link" to={`/user/${props.user.uid}`}>
        {props.user.displayName}
      </Link>
    );
  } else {
    return <span>?</span>;
  }
}

export default UserData;
