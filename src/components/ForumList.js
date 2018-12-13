import React, { Component } from 'react';
import '../styles/Posts.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { format } from 'date-fns';
import get from 'lodash/get';
import { Link } from "@reach/router"
import { COMPACT_DATE_FORMAT, STANDARD_DATE_FORMAT } from '../utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class ForumList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.titleRef = React.createRef();
	}
	componentDidMount = () => {
		this.unsubscribe = this.db.collection("forums")
		.orderBy("order")
		.onSnapshot((querySnapshot) => {
			const forumIds = [];
			if (querySnapshot.empty) {
			  this.props.setForumData(forumIds);
			}
	    querySnapshot.forEach((doc) => {
	      const forum = Object.assign(doc.data(), { id: doc.id });
    	  forumIds.push(doc.id);
			  this.props.setForumData(forumIds, Object.assign(this.props.forumsById, { [doc.id]: forum }));
	      if (forum.updatedBy && !this.props.usersByUid[forum.updatedBy]) {
  	      this.db.collection("users").doc(forum.updatedBy).get().then(userDoc => {
  	        this.props.addUserByUid(forum.updatedBy, userDoc.data());
  	      });
	      }
	    });
		});
	}
	componentWillUnmount = () => {
		this.unsubscribe();
	}
	render() {
	  if (!this.props.forumIds) {
			return (
			  <div className="forum-list-container">
		      <div className="loader loader-med"></div>
				</div>
			);
	  }
		const isMobile = window.matchMedia("(max-width: 767px)").matches;
	  const dateFormat = isMobile
	  	? COMPACT_DATE_FORMAT
	  	: STANDARD_DATE_FORMAT;
		return (
			<div className="forum-list-container">
			  <div className="section-header">All Forums</div>
				{this.props.forumIds.map((id) => {
				  const forum = this.props.forumsById[id];
				  if (!forum) {
				    return (
  						<div key={id} className="forum-row">
  				      <div className="loader loader-med"></div>
  						</div>
				    );
				  }
				  const classes = ['forum-row'];
				  const isUnread = forum.updatedTime >
				  	(get(forum, ['readBy', this.props.user.uid]) || 0);
				  if (isUnread) {
				  	classes.push('unread');
				  }
					return (
						<Link to={"forum/" + forum.id} key={forum.id} className={classes.join(' ')}>
						  <div className="forum-title">
  			          {isUnread
  			            && <FontAwesomeIcon className="icon icon-comment" icon="comment" />}
						    <span className="title-text">{forum.name}</span>
					    </div>
						  <div className="forum-meta">
  						  <span>last updated by</span>
  						  <span className="info truncatable-name">
  						    {this.props.usersByUid[forum.updatedBy]
  						      ? this.props.usersByUid[forum.updatedBy].displayName
  						      : '?'}
						      </span>
  						  {!isMobile && <span>at</span>}
  						  <span className="info">{format(forum.updatedTime, dateFormat)}</span>
						  </div>
						</Link>
					);
				})}
			</div>
		);
	}
}

export default ForumList;
