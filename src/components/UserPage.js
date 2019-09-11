import React, { useContext } from "react";
import { useGetUser } from "../utils/hooks";
import UserContext from "./UserContext";
import "../styles/Profile.css";

function UserPage(props) {
  const context = useContext(UserContext);
  const user = useGetUser(props.userId, context);
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
