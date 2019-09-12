import React, { useEffect, useState, useContext } from "react";
import UserContext from "./UserContext";
import { getUser } from "../utils/dbhelpers";
import "../styles/Profile.css";

function UserPage(props) {
  const context = useContext(UserContext);
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (context.usersByUid[props.userId]) return;
    getUser(props.userId, context).then(userData => setUser(userData));
  }, [props.userId, context]);

  if (!user) {
    return (
      <div className="loading-page">
        <div className="loader loader-big" />
      </div>
    );
  }
  const bio = user.bio ? (
    user.bio.split("\n").map(line => <div className="text-line">{line}</div>)
  ) : (
    <div className="text-line">This user has not created a bio yet.</div>
  );
  return (
    <div className="profile-container">
      <div className="user-info-header">
        <img
          className="avatar-profile"
          alt="User's Avatar"
          src={user.photoURL}
        />
        <div className="user-info">
          <div className="username">{user.displayName}</div>
          {user.mod && <div className="role">moderator</div>}
          {user.admin && <div className="role">admin</div>}
        </div>
      </div>
      <div>
        <div className="section-label">Bio</div>
        <div>{bio}</div>
      </div>
    </div>
  );
}

export default UserPage;
