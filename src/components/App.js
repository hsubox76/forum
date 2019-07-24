import React, { Component } from "react";
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
// import registerServiceWorker from '../registerServiceWorker';
import { unregister } from "../registerServiceWorker";

const history = createHistory(window);

class App extends Component {
  constructor() {
    super();
    this.state = {
      user: "unknown",
      usersByUid: {},
      addUserByUid: this.handleAddUserByUid,
      dialog: null,
      popup: null,
      hasNewContent: false,
      refreshing: false
    };
    this.inviteCodeRef = React.createRef();
    this.uiConfig = {
      // Popup signin flow rather than redirect flow.
      signInFlow: "popup",
      callbacks: {
        // Avoid redirects after sign-in.
        signInSuccessWithAuthResult: result => {
          if (result.additionalUserInfo.isNewUser) {
            // Don't need this anymore, may want to trigger other actions.
            // this.createUserProfile(result.user);
          }
        }
      },
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.GoogleAuthProvider.PROVIDER_ID
      ]
    };
  }
  componentDidMount = () => {
    history.listen(() => {
      this.logoutIfBanned();
    });
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(user => {
      this.setState({ user });
      if (user) {
        // Force get new token (temp while modding lots of people?)
        user.getIdToken(true).then(() => {
          this.logoutIfBanned();
          getClaims().then(claims => this.setState({ claims }));
        });
      }
    });
    unregister(); // unregister any existing service workers
    // registerServiceWorker(() => this.setState({ hasNewContent: true }));
    // if (navigator && navigator.serviceWorker) {
    //   navigator.serviceWorker.addEventListener('controllerchange',
    //     function() {
    //       console.log('triggering reload');
    //       if (this.state.refreshing) return;
    //       this.setState({ refreshing: true });
    //       window.location.reload();
    //     }
    //   );
    // }
  };
  componentWillUnmount = () => {
    this.unregisterAuthObserver && this.unregisterAuthObserver();
    window.removeEventListener("popstate", this.logoutIfBanned);
  };
  logoutIfBanned = () => {
    getIsBanned().then(isBanned => {
      if (isBanned) {
        firebase.auth().signOut();
      }
    });
  };
  // This goes into context.
  handleAddUserByUid = (uid, userData) => {
    this.setState({
      usersByUid: Object.assign({}, this.state.usersByUid, { [uid]: userData })
    });
  };
  handleSetDialog = dialog => {
    this.setState({ dialog });
  };
  handleSetPopup = popup => {
    this.setState({ popup });
  };
  handleCodeSubmit = e => {
    e.preventDefault();
    const code = this.inviteCodeRef.current.value;

    if (!code || !this.state.user) return;

    this.setState({ inviteError: null, processingInviteCode: true });
    submitInviteCode(code, this.state.user)
      .then(result => {
        if (get(result, "data.error")) throw new Error(result.data.error);
        this.setState({ processingInviteCode: false });
        firebase
          .auth()
          .currentUser.getIdToken(true)
          .then(() => window.location.reload());
      })
      .catch(e => {
        this.setState({
          inviteError: e.message,
          processingInviteCode: false
        });
      });
  };
  render() {
    if (
      this.state.user === "unknown" ||
      (this.state.user && !this.state.claims)
    ) {
      return (
        <div className="loading-page">
          <div className="loader loader-big" />
        </div>
      );
    } else if (!this.state.user) {
      return (
        <Router>
          <StyledFirebaseAuth
            default
            uiConfig={this.uiConfig}
            firebaseAuth={firebase.auth()}
          />
          <CreateAccount path="code/:code" />
        </Router>
      );
    } else if (get(this.state, "claims.banned")) {
      return <div className="loading-page">this user has been banned</div>;
    } else if (this.state.claims && !this.state.claims.validated) {
      return (
        <div className="App">
          <form
            className="invite-code-container"
            onSubmit={this.handleCodeSubmit}
          >
            <label>enter code</label>
            <input className="invite-input" ref={this.inviteCodeRef} />
            {this.state.processingInviteCode ? (
              <div className="loader" />
            ) : (
              <button className="button-edit">ok</button>
            )}
            {this.state.inviteError && (
              <div className="invite-error">{this.state.inviteError}</div>
            )}
          </form>
        </div>
      );
    }

    let popup = null;
    if (this.state.popup) {
      switch (this.state.popup.type) {
        case "dialog":
          popup = (
            <Dialog
              {...this.state.popup}
              onClose={() => this.setState({ popup: null })}
            />
          );
          break;
        case "merge":
          popup = (
            <MergePopup
              {...this.state.popup}
              onClose={() => this.setState({ popup: null })}
            />
          );
          break;
        default:
          popup = null;
      }
    }
    return (
      <LocationProvider history={history}>
        <UserContext.Provider value={this.state}>
          <div className="App">
            <div className="page-header">
              <div>
                <Link to="/">Home</Link>
              </div>
              <div className="account-area">
                <span className="logged-in-user">
                  {this.state.user.displayName}
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
            {/* this.state.hasNewContent &&
            <div className="message-banner">
              <div>New content available, please refresh.</div>
              <button type="none" onClick={() => {
                if (navigator && navigator.serviceWorker) {
                  console.log('checking registration');
                  navigator.serviceWorker
                    .getRegistration()
                    .then(reg => {
                      console.log('posting skipWaiting message');
                      reg.waiting.postMessage('skipWaiting');
                    });
                }
              }}>
                reload page
              </button>
            </div>
            */}
            <Router>
              <ForumList path="/" user={this.state.user} />
              <ThreadList path="forum/:forumId" user={this.state.user} />
              <PostList
                path="forum/:forumId/thread/:threadId"
                user={this.state.user}
                setDialog={this.handleSetDialog}
                setPopup={this.handleSetPopup}
              />
              <Help path="help" />
              <Profile path="profile" user={this.state.user} />
              <UserPage path="user/:userId" />
              <Admin path="admin/*" user={this.state.user} />
              <Invite path="invite" user={this.state.user} />
              <CreateAccount
                path="code/:code"
                user={this.state.user}
                claims={this.state.claims}
              />
              <NotFound default />
            </Router>
            {popup}
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
}

export default App;
