import React, {useContext} from 'react';
import { useGetUser } from '../utils/hooks';
import UserContext from './UserContext';

function UserData(props) {
  const context = useContext(UserContext);
  const user = useGetUser(props.uid, context);
  if (user) {
    return (<span>{user.displayName}</span>);
  } else {
    return (<span>?</span>);
  }
}

export default UserData;
