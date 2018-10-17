import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './components/App';
import registerServiceWorker from './registerServiceWorker';
import firebase from 'firebase';

const config = {
  apiKey: process.env.REACT_APP_FORUM_API_KEY,
  authDomain: process.env.REACT_APP_FORUM_PROJECT_ID + ".firebaseapp.com",
  databaseURL: "https://" + process.env.REACT_APP_FORUM_PROJECT_ID + ".firebaseio.com",
  projectId: process.env.REACT_APP_FORUM_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FORUM_PROJECT_ID + ".appspot.com"
};

firebase.initializeApp(config);

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
