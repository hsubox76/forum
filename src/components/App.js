import React, { Component } from 'react';
import '../styles/App.css';
import { Router, Link, LocationProvider, createHistory } from '@reach/router';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import Dialog from './Dialog.js';
import ForumList from './ForumList.js';
import Help from './Help.js';
import Admin from './Admin.js';
import Invite from './Invite.js';
import ThreadList from './ThreadList.js';
import PostList from './PostList.js';
import Profile from './Profile.js';
import UserContext from './UserContext.js';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import get from 'lodash/get';
import { getClaims, getIsBanned } from '../utils/dbhelpers';
// import registerServiceWorker from '../registerServiceWorker';
import { unregister } from '../registerServiceWorker';

const history = createHistory(window);

class App extends Component {
  constructor() {
    super();
    this.state = {
      user: 'unknown',
      usersByUid: {},
      addUserByUid: this.handleAddUserByUid,
      dialog: null,
      hasNewContent: false,
      refreshing: false,
    };
		this.inviteCodeRef = React.createRef();
		this.db = firebase.firestore();
    this.db.settings({timestampsInSnapshots: true});
	  this.uiConfig = {
      // Popup signin flow rather than redirect flow.
      signInFlow: 'popup',
      callbacks: {
        // Avoid redirects after sign-in.
        signInSuccessWithAuthResult: (result) => {
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
    // Force get new token (temp while modding lots of people?)
    if (firebase.auth().currentUser) {
      firebase.auth().currentUser.getIdToken(true);
    }
    history.listen(() => {
      this.logoutIfBanned();
    });
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => {
          this.setState({ user });
          if (user) {
            this.logoutIfBanned();
            getClaims().then(claims => this.setState({ claims }));
          }
        }
    );
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
  }
  componentWillUnmount = () => {
    this.unregisterAuthObserver && this.unregisterAuthObserver();
    window.removeEventListener('popstate', this.logoutIfBanned);
  }
  logoutIfBanned = () => {
    console.log('logoutIfBanned running');
    getIsBanned().then(isBanned => {
      if (isBanned) {
        firebase.auth().signOut();
      }
    })
  };
  // This goes into context.
  handleAddUserByUid = (uid, userData) => {
		this.setState({
			usersByUid: Object.assign({}, this.state.usersByUid, { [uid]: userData })
		});
	}
	handleSetDialog = dialog => {
	  this.setState({dialog});
	}
	handleCodeSubmit = (e) => {
	  e.preventDefault();
	  const code = this.inviteCodeRef.current.value;
	  
	  if (!code || !this.state.user) return;
	  
    this.setState({ inviteError: null });
	  this.db.collection("invites").doc(code).get()
	    .then(ref => {
	      if (!ref.data()) {
	        throw new Error(`Code ${code} not found.`);
	      }
	      if (ref.data().wasUsed === false) {
	        const user =
	          Object.assign({}, this.state.user, { verifiedWithCode: true });
	        return user;
	      } else {
	        throw new Error(`Code ${code} has already been used.`);
	      }
	    })
	    .then(user => {
	      const userUpdate = this.db.collection("users")
	        .doc(this.state.user.uid)
	        .update({
  	        verifiedWithCode: true
  	      });
  	    const { displayName, email }  = this.state.user;
	      const inviteUpdate = this.db.collection("invites")
	        .doc(code)
	        .update({
  	        wasUsed: true,
  	        usedAt: Date.now(),
  	        usedBy: `${displayName} (${email})`
  	      });
	      Promise.all([userUpdate, inviteUpdate]).then(() => {
	        this.setState({ user });
	      });
	    })
	    .catch((e) => {
        this.setState({
          inviteError: e.message
        });
	    });
	}
  render() {
    if (this.state.user === 'unknown') {
      return (
        <div className="loading-page">
  				<div className="loader loader-big"></div>
  			</div>);
    } else if (!this.state.user) {
      return (
        <StyledFirebaseAuth
          uiConfig={this.uiConfig}
          firebaseAuth={firebase.auth()}
        />
      );
    } else if (get(this.state, 'claims.banned')) {
      return (
        <div className="loading-page">
  				this user has been banned
  			</div>);
    }
    /* else if (!this.state.user.verifiedWithCode) {
      return (
        <div className="App">
          <form className="invite-code-container" onSubmit={this.handleCodeSubmit}>
            <label>enter code</label>
            <input className="invite-input" ref={this.inviteCodeRef} />
            <button className="button-edit">ok</button>
            {this.state.inviteError &&
              <div className="invite-error">{this.state.inviteError}</div>}
          </form>
        </div>
      );
    } */
    return (
      <LocationProvider history={history}>
      <UserContext.Provider value={this.state}>
        <div className="App">
          <div className="page-header">
            <div><Link to="/">Home</Link></div>
            <div className="account-area">
              <span className="logged-in-user">{this.state.user.displayName}</span>
              <Link to="/help">Help</Link>
              <Link to="/invite">Invite</Link>
              <Link to="/profile">Edit profile</Link>
              <span
                className="sign-out-button"
                onClick={() => firebase.auth().signOut()}>
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
            <ForumList
              path="/"
              user={this.state.user}
            />
            <ThreadList
              path="forum/:forumId"
              user={this.state.user}
            />
            <PostList
              path="forum/:forumId/thread/:threadId"
              user={this.state.user}
              setDialog={this.handleSetDialog}
            />
            <Help path="help" />
            <Profile path="profile" user={this.state.user} />
            <Admin path="admin" user={this.state.user} />
            <Invite path="invite" user={this.state.user} />
          </Router>
          {this.state.dialog &&
            <Dialog {...this.state.dialog} onClose={() => this.setState({dialog: null})} />}
          <div className="footer">
            <div>COMMIT_REF: {process.env.REACT_APP_COMMIT_REF && process.env.REACT_APP_COMMIT_REF.substr(0, 7)}</div>
          </div>
        </div>
      </UserContext.Provider>
      </LocationProvider>
    );
  }
}

export default App;
