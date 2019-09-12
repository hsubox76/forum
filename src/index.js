import React from "react";
import ReactDOM from "react-dom";
import "./styles/index.css";
import App from "./components/App";
// import SiteDown from './components/SiteDown';
import firebase from "firebase/app";
import "firebase/performance";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faThumbtack,
  faComment,
  faLaughBeam,
  faAngry,
  faSurprise,
  faSadTear,
  faHeart,
  faThumbsUp,
  faThumbsDown
} from "@fortawesome/free-solid-svg-icons";

library.add(faThumbtack);
library.add(faComment);
library.add(faLaughBeam);
library.add(faAngry);
library.add(faSurprise);
library.add(faSadTear);
library.add(faHeart);
library.add(faThumbsUp);
library.add(faThumbsDown);

const config = {
  apiKey: process.env.REACT_APP_FORUM_API_KEY,
  authDomain: process.env.REACT_APP_FORUM_PROJECT_ID + ".firebaseapp.com",
  databaseURL:
    "https://" + process.env.REACT_APP_FORUM_PROJECT_ID + ".firebaseio.com",
  projectId: process.env.REACT_APP_FORUM_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FORUM_PROJECT_ID + ".appspot.com",
  appId: "1:112329939446:web:bdd30a41a23575bc"
};

firebase.initializeApp(config);
firebase.performance();

ReactDOM.render(<App />, document.getElementById("root"));
