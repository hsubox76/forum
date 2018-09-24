import React, { Component } from 'react';
import './App.css';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import PostList from './PostList.js';
import firebase from 'firebase';

// Configure FirebaseUI.
const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: 'popup',
  callbacks: {
    // Avoid redirects after sign-in.
    signInSuccessWithAuthResult: () => false
  },
  // We will display Google and Facebook as auth providers.
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ]
};

class App extends Component {
  constructor() {
    super();
    this.state = {
      user: 'unknown'
    };
  }
  componentDidMount = () => {
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => this.setState({ user })
    );
  }
  render() {
    if (this.state.user === 'unknown') {
      return <div className="loading-page">loading...</div>
    } else if (!this.state.user) {
      return (
        <StyledFirebaseAuth
          uiConfig={uiConfig}
          firebaseAuth={firebase.auth()}
        />
      );
    }
    return (
      <div className="App">
        <a onClick={() => firebase.auth().signOut()}>Sign-out</a>
        <PostList />
      </div>
    );
  }
}

export default App;
