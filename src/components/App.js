import React, { useState, useEffect, useRef } from "react";
import "../styles/App.css";
import { Router, Link, LocationProvider, createHistory } from "@reach/router";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import Dialog from "./Dialog.js";
import MergePopup from "./MergePopup.js";
import ForumList from "./ForumList.js";
import Help from "./Help.js";
import NotFound from "./NotFound.js";
import Admin from "./Admin/Admin.js";
import Invite from "./Invite.js";
import ThreadList from "./ThreadList.js";
import PostList from "./PostList.js";
import Profile from "./Profile.js";
import UserPage from "./UserPage.js";
import UserContext from "./UserContext.js";
import CreateAccount from "./CreateAccount.js";
import firebase from "firebase/app";
import "firebase/auth";
import get from "lodash/get";
import { getClaims, getIsBanned, submitInviteCode } from "../utils/dbhelpers";

const history = createHistory(window);

const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: "popup",
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ]
};

const logoutIfBanned = () => {
    getIsBanned().then(isBanned => {
      if (isBanned) {
        firebase.auth().signOut();
      }
    });
  };

const App = () => {
  const [user, setUser] = useState('unknown');
  const [claims, setClaims] = useState(null);
  const [popup, setPopup] = useState(null);
  const [inviteStatus, setInviteStatus] = useState(null);
  const inviteCodeRef = useRef(null);
  const [usersByUid, setUsersByUid] = useState({});

  const unregisterAuthObserver = useRef(() => {});

  // On mount
  useEffect(() => {
    history.listen(() => {
      logoutIfBanned();
    });
    unregisterAuthObserver.current = firebase.auth().onAuthStateChanged(user => {
      setUser(user);
      if (user) {
        // Force get new token (temp while modding lots of people?)
        user.getIdToken(true).then(() => {
          logoutIfBanned();
          getClaims().then(claims => setClaims(claims));
        });
      }
    });
    // On unmount??
    return () => {
      unregisterAuthObserver.current && unregisterAuthObserver.current();
      window.removeEventListener("popstate", logoutIfBanned);
    }
  }, []);

  function handleMergeUsers(usersToMerge) {
    setUsersByUid(Object.assign({}, usersByUid, usersToMerge));
  }

  function handleAddUserByUid(uid, userData) {
    if (usersByUid[uid] && usersByUid[uid].displayName === userData.displayName) {
      return;
    }
    setUsersByUid(Object.assign({}, usersByUid, { [uid]: userData }));
    return userData;
  };

  function handleSetDialog(dialog) {
    setPopup(Object.assign({ type: "dialog" }, dialog));
  };

  function handleSetPopup(popup) {
    setPopup(popup);
  };

  function handleCodeSubmit(e) {
    e.preventDefault();
    const code = inviteCodeRef.current.value;

    if (!code || !user) return;

    setInviteStatus({ error: null, processingCode: true });
    submitInviteCode(code, user)
      .then(result => {
        if (get(result, "data.error")) throw new Error(result.data.error);
        setInviteStatus({ error: null, processingCode: false });
        firebase
          .auth()
          .currentUser.getIdToken(true)
          .then(() => window.location.reload());
      })
      .catch(e => {
        setInviteStatus({ error: e.message, processingCode: false });
      });
  };

  if (
    user === "unknown" ||
    (user && !claims)
  ) {
    return (
      <div className="loading-page">
        <div className="loader loader-big" />
      </div>
    );
  } else if (!user) {
    return (
      <Router>
        <StyledFirebaseAuth
          default
          uiConfig={uiConfig}
          firebaseAuth={firebase.auth()}
        />
        <CreateAccount path="code/:code" />
      </Router>
    );
  } else if (claims && claims.banned) {
    return <div className="loading-page">this user has been banned</div>;
  } else if (claims && !claims.validated) {
    return (
      <div className="App">
        <form
          className="invite-code-container"
          onSubmit={handleCodeSubmit}
        >
          <label>enter code</label>
          <input className="invite-input" ref={inviteCodeRef} />
          {inviteStatus.processingCode ? (
            <div className="loader" />
          ) : (
            <button className="button-edit">ok</button>
          )}
          {inviteStatus.inviteError && (
            <div className="invite-error">{inviteStatus.inviteError}</div>
          )}
        </form>
      </div>
    );
  }

  let popupElement = null;
  if (popup) {
    switch (popup.type) {
      case "dialog":
        popupElement = (
          <Dialog
            {...popup}
            onClose={() => setPopup(null)}
          />
        );
        break;
      case "merge":
        popupElement = (
          <MergePopup
            {...popup}
            onClose={() => setPopup(null)}
          />
        );
        break;
      default:
        popupElement = null;
    }
  }
  return (
    <LocationProvider history={history}>
      <UserContext.Provider value={{ usersByUid: usersByUid, addUserByUid: handleAddUserByUid, mergeUsers: handleMergeUsers }}>
        <div className="App">
          <div className="page-header">
            <div>
              <Link to="/">Home</Link>
            </div>
            <div className="account-area">
              <span className="logged-in-user">
                {user.displayName}
              </span>
              <Link to="/help">Help</Link>
              <Link to="/invite">Invite</Link>
              <Link to="/profile">Edit profile</Link>
              <span
                className="sign-out-button"
                onClick={() => firebase.auth().signOut()}
              >
                Logout
              </span>
            </div>
          </div>
          <Router>
            <ForumList path="/" user={user} />
            <ThreadList path="forum/:forumId" user={user} />
            <PostList
              path="forum/:forumId/thread/:threadId"
              user={user}
              setDialog={handleSetDialog}
              setPopup={handleSetPopup}
            />
            <Help path="help" />
            <Profile path="profile" user={user} />
            <UserPage path="user/:userId" />
            <Admin path="admin/*" user={user} />
            <Invite path="invite" user={user} />
            <CreateAccount
              path="code/:code"
              user={user}
              claims={claims}
            />
            <NotFound default />
          </Router>
          {popupElement}
          <div className="footer">
            <div>
              COMMIT_REF:{" "}
              {process.env.REACT_APP_COMMIT_REF &&
                process.env.REACT_APP_COMMIT_REF.substr(0, 7)}
            </div>
          </div>
        </div>
      </UserContext.Provider>
    </LocationProvider>
  );
}

export default App;
