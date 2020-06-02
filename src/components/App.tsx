import React, { useState, useEffect, useRef, FormEvent } from "react";
import {
  Router,
  Link,
  LocationProvider,
  createHistory,
} from "@reach/router";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import Dialog from "./Dialog";
import MergePopup from "./MergePopup";
import ForumList from "./ForumList";
import Help from "./Help";
import NotFound from "./NotFound";
import Admin from "./Admin/Admin";
import Invite from "./Invite";
import ThreadList from "./ThreadList";
import PostList from "./PostList";
import Profile from "./Profile";
import UserPage from "./UserPage";
import UserContext from "./UserContext";
import CreateAccount from "./CreateAccount";
import firebase from "firebase/app";
import "firebase/auth";
import get from "lodash/get";
import { getClaims, getIsBanned, submitInviteCode } from "../utils/dbhelpers";
import { useUserSettings } from "../utils/hooks";
import { Claims, UserPublic, DialogData } from "../utils/types";

// @ts-ignore
const history = createHistory(window);

const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: "popup",
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  ],
};

const logoutIfBanned = () => {
  getIsBanned().then((isBanned) => {
    if (isBanned) {
      firebase.auth().signOut();
    }
  });
};

const App = () => {
  const [user, setUser] = useState<firebase.User | undefined | null>();
  const [claims, setClaims] = useState<Claims>();
  const [popup, setPopup] = useState<DialogData | null>(null);
  const [inviteStatus, setInviteStatus] = useState({
    error: null,
    processingCode: false
  });
  const inviteCodeRef = useRef<HTMLInputElement | null>(null);
  const [usersByUid, setUsersByUid] = useState<{ [uid: string]: UserPublic }>(
    {}
  );

  const unregisterAuthObserver = useRef(() => {});

  // On mount
  useEffect(() => {
    history.listen(() => {
      logoutIfBanned();
    });
    unregisterAuthObserver.current = firebase
      .auth()
      .onAuthStateChanged((user) => {
        setUser(user);
        if (user) {
          // Force get new token (temp while modding lots of people?)
          user.getIdToken(true).then(() => {
            logoutIfBanned();
            getClaims().then((claims) => setClaims(claims));
          });
        }
      });
    // On unmount??
    return () => {
      unregisterAuthObserver.current && unregisterAuthObserver.current();
      window.removeEventListener("popstate", logoutIfBanned);
    };
  }, []);

  const userSettings = useUserSettings(user?.uid);

  function handleMergeUsers(usersToMerge: { [uid: string]: UserPublic }) {
    setUsersByUid(Object.assign({}, usersByUid, usersToMerge));
  }

  function handleAddUserByUid(uid: string, userData: UserPublic) {
    if (
      usersByUid[uid] &&
      usersByUid[uid].displayName === userData.displayName
    ) {
      return;
    }
    setUsersByUid(Object.assign({}, usersByUid, { [uid]: userData }));
    return userData;
  }

  function handleSetDialog(dialog: DialogData) {
    setPopup({ ...dialog, type: "dialog" });
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    const code = inviteCodeRef.current?.value;

    if (!code || !user) return;

    setInviteStatus({ error: null, processingCode: true });
    try {
      const result = await submitInviteCode(code, user);
      if (get(result, "data.error")) throw new Error(result.data.error);
      setInviteStatus({ error: null, processingCode: false });
      await firebase.auth().currentUser?.getIdToken(true);
      window.location.reload();
    } catch (e) {
      setInviteStatus({ error: e.message, processingCode: false });
    }
  }

  if (user === undefined || (user && !claims)) {
    return (
      <div className="page-center">
        <div className="loader loader-big" />
      </div>
    );
  } else if (!user) {
    return (
      <Router>
        <StyledFirebaseAuth
          uiConfig={uiConfig}
          firebaseAuth={firebase.auth()}
        />
        <CreateAccount path="code/:code" />
      </Router>
    );
  } else if (claims && claims.banned) {
    return <div className="page-center">this user has been banned</div>;
  } else if (claims && !claims.validated) {
    return (
      <div className="container mx-auto">
        <form
          className="flex flex-col space-y-2 mx-auto w-4/5 my-4 items-start"
          onSubmit={handleCodeSubmit}
        >
          <label className="text-lg">enter invite code</label>
          <input className="p-1 self-stretch" ref={inviteCodeRef} />
          {inviteStatus && inviteStatus.processingCode ? (
            <div className="loader" />
          ) : (
            <button className="btn btn-ok">ok</button>
          )}
          {inviteStatus && inviteStatus.error && (
            <div className="invite-error">{inviteStatus.error}</div>
          )}
        </form>
      </div>
    );
  }

  let popupElement = null;
  if (popup) {
    switch (popup.type) {
      case "dialog":
        popupElement = <Dialog {...popup} onClose={() => setPopup(null)} />;
        break;
      case "merge":
        popupElement = <MergePopup {...popup} onClose={() => setPopup(null)} />;
        break;
      default:
        popupElement = null;
    }
  }
  return (
    <LocationProvider history={history}>
      <UserContext.Provider
        value={{
          usersByUid: usersByUid,
          addUserByUid: handleAddUserByUid,
          mergeUsers: handleMergeUsers,
        }}
      >
        <div className="container mx-auto">
          <div className="bg-main text-white flex items-center justify-between p-2">
            <div>
              <Link to="/" className="text-lg">
                Home
              </Link>
            </div>
            <div className="flex">
              <span className="font-bold px-2 mx-2 border rounded py-1">
                {user.displayName}
              </span>
              <div className="flex divide-x items-center">
                <Link to="/help" className="px-2">
                  Help
                </Link>
                <Link to="/invite" className="px-2">
                  Invite
                </Link>
                <Link to="/profile" className="px-2">
                  Edit profile
                </Link>
                <button
                  className="px-2"
                  onClick={() => firebase.auth().signOut()}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
          <Router primary={false}>
            <ForumList path="/" user={user} />
            <ThreadList
              path="forum/:forumId"
              user={user}
              userSettings={userSettings}
            />
            <PostList
              path="forum/:forumId/thread/:threadId"
              user={user}
              setDialog={handleSetDialog}
              userSettings={userSettings}
            />
            <Help path="help" />
            <Profile path="profile" user={user} />
            <UserPage path="user/:userId" />
            <Admin path="admin/*" />
            <Invite path="invite" user={user} />
            <CreateAccount path="code/:code" />
            <NotFound default />
          </Router>
          {popupElement}
          <div className="flex flex-row-reverse">
            <div className="border p-1 rounded text-sm">
              COMMIT_REF:{" "}
              {process.env.REACT_APP_COMMIT_REF &&
                process.env.REACT_APP_COMMIT_REF.substr(0, 7)}
            </div>
          </div>
        </div>
      </UserContext.Provider>
    </LocationProvider>
  );
};

export default App;
