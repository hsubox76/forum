import React, { useContext } from "react";
import { format } from "date-fns";
import { useGetUser } from "../utils/hooks";
import UserContext from "./UserContext";
import "../styles/Profile.css";
import { STANDARD_DATE_FORMAT } from "../utils/constants";

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
          {user.customClaims.mod && <div className="role">moderator</div>}
          {user.customClaims.admin && <div className="role">admin</div>}
        </div>
      </div>
      <div>
        <div className="section-label">Bio</div>
        <div>{bio}</div>
      </div>
      <div>
        <div className="section-label">Account created</div>
        <div className="text-line">
          {format(user.metadata.creationTime, STANDARD_DATE_FORMAT)}
        </div>
      </div>
      <div>
        <div className="section-label">Last signed in</div>
        <div className="text-line">
          {format(user.metadata.lastSignInTime, STANDARD_DATE_FORMAT)}
        </div>
      </div>
    </div>
  );
}

export default UserPage;
