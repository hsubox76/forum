import React, {useContext} from 'react';
import { format } from 'date-fns';
import { useGetUser } from '../utils/hooks';
import UserContext from './UserContext';
import '../styles/Profile.css';
import { STANDARD_DATE_FORMAT } from '../utils/constants';

function UserPage(props) {
  const context = useContext(UserContext);
  const user = useGetUser(props.userId, context);
  if (!user) {
    return (
      <div className="loading-page">
        <div className="loader loader-big"></div>
      </div>
    );
  }
  return (
    <div className="profile-container">
      <div className="user-info-header">
        <img className="avatar-profile" alt="User's Avatar" src={user.photoURL} />
        <div className="user-info">
          <div className="username">{user.displayName}</div>
          {user.customClaims.mod && <div>moderator</div>}
          {user.customClaims.admin && <div>admin</div>}
        </div>
      </div>
      <div>Account created {format(user.metadata.creationTime, STANDARD_DATE_FORMAT)}</div>
      <div>Last signed in {format(user.metadata.lastSignInTime, STANDARD_DATE_FORMAT)}</div>
    </div>
  );
}

export default UserPage;
