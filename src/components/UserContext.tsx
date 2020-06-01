import React from "react";
import { UserPublic } from "../utils/types";

export interface UserContextInterface {
  usersByUid: { [uid: string]: UserPublic },
  addUserByUid: (uid: string, userData: UserPublic) => void,
  mergeUsers: (usersToMerge: { [key: string]: UserPublic }) => void,
}

const UserContext = React.createContext<UserContextInterface>({
  usersByUid: {},
  addUserByUid: () => {},
  mergeUsers: () => {}
});

export default UserContext;
