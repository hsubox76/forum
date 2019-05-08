import React from "react";

const UserContext = React.createContext({
  usersByUid: {},
  addUserByUid: () => {}
});

export default UserContext;
