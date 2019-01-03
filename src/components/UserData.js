import React, {useContext} from 'react';
import { Link } from '@reach/router';
import { useGetUser } from '../utils/hooks';
import UserContext from './UserContext';

function UserData(props) {
  const context = useContext(UserContext);
  const user = useGetUser(props.uid, context);
  if (user) {
    return (<Link className="user-name-link" to={`/user/${user.uid}`}>{user.displayName}</Link>);
  } else {
    return (<span>?</span>);
  }
}

export default UserData;
