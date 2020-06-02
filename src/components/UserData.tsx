import React from "react";
import { Link } from "@reach/router";
import { UserPublic } from "../utils/types";

function UserData(props: { user: UserPublic }) {
  if (props.user) {
    return (
      <Link className="text-ok font-medium" to={`/user/${props.user.id}`}>
        {props.user.displayName}
      </Link>
    );
  } else {
    return <span>?</span>;
  }
}

export default UserData;
