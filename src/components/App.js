import React, { Component } from 'react';
import '../styles/App.css';
import { Router, Link } from '@reach/router';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import Dialog from './Dialog.js';
import ForumList from './ForumList.js';
import Help from './Help.js';
import ThreadList from './ThreadList.js';
import PostList from './PostList.js';
import Profile from './Profile.js';
import firebase from 'firebase';
import 'firebase/firestore';

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
      dialog: null
    };
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
	  this.uiConfig = {
      // Popup signin flow rather than redirect flow.
      signInFlow: 'popup',
      callbacks: {
        // Avoid redirects after sign-in.
        signInSuccessWithAuthResult: (result) => {
          if (result.additionalUserInfo.isNewUser) {
        		this.db.collection("users").doc(result.user.uid).set({
                displayName: result.user.displayName,
                email: result.user.email
            });
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
          if (user) {
        		this.db.collection("users").doc(user.uid)
        		  .get()
        		  .then(docRef => {
        		    if (docRef) {
        		      user.isAdmin = docRef.data().isAdmin;
        		    }
        		  })
        		  .catch(e => {
        		    // If we never got this user into the DB
            		this.db.collection("users").doc(user.uid).set({
                    displayName: user.displayName,
                    email: user.email
                });
        		  });
          }
          this.setState({ user });
        }
    );
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
    }
    return (
      <div className="App">
        <div className="page-header">
          <div><Link to="/">Home</Link></div>
          <div className="account-area">
            <span className="logged-in-user">{this.state.user.displayName}</span>
            <Link to="/help">Help</Link>
            <Link to="/profile">Edit profile</Link>
            <a
              className="sign-out-button"
              onClick={() => firebase.auth().signOut()}>
                Logout
            </a>
          </div>
        </div>
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
        </Router>
        {this.state.dialog &&
          <Dialog {...this.state.dialog} onClose={() => this.setState({dialog: null})} />}
      </div>
    );
  }
}

export default App;
