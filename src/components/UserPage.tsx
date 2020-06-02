import React, { useEffect, useState, useContext } from "react";
import UserContext from "./UserContext";
import { getUser } from "../utils/dbhelpers";
import { UserPublic } from "../utils/types";
import { RouteComponentProps } from "@reach/router";

interface UserPageProps extends RouteComponentProps<{ userId: string }> {
}

function UserPage(props: UserPageProps) {
  const context = useContext(UserContext);
  const [user, setUser] = useState<UserPublic | undefined>();
  useEffect(() => {
    if (!props.userId) return;
    if (user || context.usersByUid[props.userId]) {
      if (!user) {
        setUser(context.usersByUid[props.userId]);
      }
      return;
    }
    getUser(props.userId, context, true).then((userData) => setUser(userData));
  }, [props.userId, context, user]);

  if (!user) {
    return (
      <div className="page-center">
        <div className="loader loader-big" />
      </div>
    );
  }
  const bio = user.bio ? (
    user.bio.split("\n").map((line) => <div className="text-line">{line}</div>)
  ) : (
    <div className="text-line">This user has not created a bio yet.</div>
  );
  return (
    <div>
      <div className="flex items-end my-2">
        <img className="w-24 h-24" alt="User's Avatar" src={user.photoURL} />
        <div className="ml-2">
          <div className="text-xl text-main">{user.displayName}</div>
          {user.mod && <div className="text-lg">moderator</div>}
          {user.admin && <div className="text-lg">admin</div>}
        </div>
      </div>
      <div>
        <div className="text-xl">Bio</div>
        <div>{bio}</div>
      </div>
    </div>
  );
}

export default UserPage;
