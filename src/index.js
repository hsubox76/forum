import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './components/App';
import registerServiceWorker from './registerServiceWorker';
import firebase from 'firebase';

var config = {
  apiKey: "AIzaSyBS-cXJxcGlr3_F8yDxCsW4XmLGNr-ThBc",
  authDomain: "forum-a5979.firebaseapp.com",
  databaseURL: "https://forum-a5979.firebaseio.com",
  projectId: "forum-a5979",
  storageBucket: "forum-a5979.appspot.com",
  messagingSenderId: "112329939446"
};

firebase.initializeApp(config);

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
