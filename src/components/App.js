import React, { Component } from 'react';
import '../styles/App.css';
import { Router, Link } from '@reach/router';
import isEmpty from 'lodash/isEmpty';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import Dialog from './Dialog.js';
import ForumList from './ForumList.js';
import Help from './Help.js';
import Admin from './Admin.js';
import Invite from './Invite.js';
import ThreadList from './ThreadList.js';
import PostList from './PostList.js';
import Profile from './Profile.js';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import registerServiceWorker from '../registerServiceWorker';

class App extends Component {
  constructor() {
    super();
    this.state = {
      user: 'unknown',
      usersByUid: {},
      threadIds: null,
      threadsById: {},
      forumIds: null,
      forumsById: {},
      dialog: null,
      hasNewContent: false
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
        		this.createUserProfile(result.user);
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
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => {
          // Set if null, otherwise get more data
          if (!user) {
            this.unregisterProfileObserver && this.unregisterProfileObserver();
            this.unregisterProfileObserver = null;
            this.unregisterRolesObserver && this.unregisterRolesObserver();
            this.unregisterRolesObserver = null;
            this.setState({ user });
          } else {
            this.updateUserData(user);
          }
        }
    );
    registerServiceWorker(() => this.setState({ hasNewContent: true }));
  }
  componentDidUpdate = () => {
    if (!this.unregisterProfileObserver && this.state.user) {
      this.updateUserData(this.state.user);
    }
  }
  componentWillUnmount = () => {
    this.unregisterRolesObserver && this.unregisterRolesObserver();
    this.unregisterProfileObserver && this.unregisterProfileObserver();
    this.unregisterAuthObserver && this.unregisterAuthObserver();
  }
  createUserProfile = (user) => {
		this.db.collection("users").doc(user.uid).set({
        displayName: user.displayName,
        email: user.email,
        verifiedWithCode: false
    });
  }
  updateUserData = (user) => {
    if (!user) return;
    this.unregisterRolesObserver = this.db.collection("roles")
      .onSnapshot(
        querySnapshot => {
          const userUpdates = { rolesLoaded: true };
          querySnapshot.forEach(docRef => {
            if (docRef && docRef.data()) {
              if (docRef.id === 'admins') {
                if (docRef.data().ids.includes(user.uid)) {
                  userUpdates.isAdmin = true;
                }
              }
              if (docRef.id === 'bannedUsers') {
                if (docRef.data().ids.includes(user.uid)) {
                  userUpdates.isBanned = true;
                }
              }
            }
          });
          this.setState({ user: Object.assign({}, user, this.state.user, userUpdates) });
        }
      );
		this.unregisterProfileObserver = this.db.collection("users").doc(user.uid)
		  .onSnapshot(
		    docRef => {
  		    if (docRef && docRef.data()) {
  		      const userUpdates = { profileLoaded: true };
  		      userUpdates.avatarUrl = docRef.data().avatarUrl;
            const profileUpdates = {};
  		      if (user.displayName !== docRef.data().displayName) {
  		        profileUpdates.displayName = docRef.data().displayName;
  		      }
  		      if (!isEmpty(profileUpdates)) {
              user.updateProfile(profileUpdates);
  		      }
  		      // Don't try to update the firebase auth profile with this.
  		      // Just used locally.
  		      userUpdates.verifiedWithCode = docRef.data().verifiedWithCode;
            this.setState({ user: Object.assign({}, this.state.user, userUpdates) });
  		    } else {
  		      // no profile?
      		  let error = 'unknown';
      		  if (!docRef) {
      		    error = 'no docRef';
      		  }
      		  if (docRef && !docRef.data()) {
      		    error = 'no docRef.data()';
      		    // this.createUserProfile(user);
      		  }
      		  const timestamp = Date.now();
      		  this.db.collection("errors").add({
      		    error,
      		    timestamp,
      		    date: new Date(timestamp).toString(),
      		    userId: user.uid,
      		    name: user.displayName,
      		    docRef: docRef || 'none'
      		  });
  		    }
  		  },
		    e => {
  		    // If we never got this user into the DB
      		// this.createUserProfile(user);
      		const timestamp = Date.now();
      		this.db.collection("errors").add({
      		  error: 'onSnapshot error callback',
      		  timestamp,
      		  date: new Date(timestamp).toString(),
      		  message: e.message,
      		  userId: user.uid,
      		  name: user.displayName
      		});
		  });
  }
  handleAddUserByUid = (uid, userData) => {
		this.setState({
			usersByUid: Object.assign({}, this.state.usersByUid, { [uid]: userData })
		});
	}
	handleSetThreadData = (threadIds, threadsById) => {
	  const updates = { threadIds };
	  if (threadsById) {
	    updates.threadsById = threadsById;
	  }
	  this.setState(updates);
	}
	handleSetForumData = (forumIds, forumsById) => {
	  const updates = {};
	  if (forumIds) {
	    updates.forumIds = forumIds;
	  }
	  if (forumsById) {
	    updates.forumsById = forumsById;
	  }
	  this.setState(updates);
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
    } else if (!this.state.user.profileLoaded || !this.state.user.rolesLoaded) {
      return (
        <div className="loading-page">
  				<div className="loader loader-big"></div>
  			</div>);
    } else if (this.state.user.isBanned) {
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
      <div className="App">
        <div className="page-header">
          <div><Link to="/">Home</Link></div>
          <div className="account-area">
            <span className="logged-in-user">{this.state.user.displayName}</span>
            <Link to="/help">Help</Link>
            <Link to="/invite">Invite</Link>
            <Link to="/profile">Edit profile</Link>
            <a
              className="sign-out-button"
              onClick={() => firebase.auth().signOut()}>
                Logout
            </a>
          </div>
        </div>
        {this.state.hasNewContent &&
          <div className="message-banner">
            <div>New content available, please refresh.</div>
            <button type="none" onClick={() => window.location.reload()}>
              reload page
            </button>
          </div>
        }
        <Router>
          <ForumList
            path="/"
            user={this.state.user}
            usersByUid={this.state.usersByUid}
            forumIds={this.state.forumIds}
            forumsById={this.state.forumsById}
            addUserByUid={this.handleAddUserByUid}
            setForumData={this.handleSetForumData}
          />
          <ThreadList
            path="forum/:forumId"
            forumsById={this.state.forumsById}
            user={this.state.user}
            usersByUid={this.state.usersByUid}
            threadIds={this.state.threadIds}
            threadsById={this.state.threadsById}
            addUserByUid={this.handleAddUserByUid}
            setThreadData={this.handleSetThreadData}
            setForumData={this.handleSetForumData}
          />
          <PostList
            path="forum/:forumId/thread/:threadId"
            user={this.state.user}
            setDialog={this.handleSetDialog}
            usersByUid={this.state.usersByUid}
            addUserByUid={this.handleAddUserByUid}
            forumsById={this.state.forumsById}
            setForumData={this.handleSetForumData}
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
    );
  }
}

export default App;
