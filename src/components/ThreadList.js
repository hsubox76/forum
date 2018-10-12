import React, { Component } from 'react';
import '../styles/Posts.css';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import { Link, navigate } from "@reach/router"
import { STANDARD_DATE_FORMAT } from '../utils/constants';

class ThreadList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.titleRef = React.createRef();
		this.state = { threadIds: null, threadsById: {} };
	}
	componentDidMount = () => {
		this.unsubscribe = this.db.collection("threads")
		.orderBy("createdTime")
		.onSnapshot((querySnapshot) => {
			const threadIds = [];
			if (querySnapshot.empty) {
			  this.props.setThreadData(threadIds);
			}
	    querySnapshot.forEach((doc) => {
	      const thread = Object.assign(doc.data(), { id: doc.id });
    	  threadIds.push(doc.id);
			  this.props.setThreadData(threadIds, Object.assign(this.props.threadsById, { [doc.id]: thread }));
        // Get all users associated with this thread, try to avoid duplicate effort
        if (!this.props.usersByUid[thread.createdBy]) {
  	      this.db.collection("users").doc(thread.createdBy).get().then(userDoc => {
  	        this.props.addUserByUid(thread.createdBy, userDoc.data());
  	      });
        }
	      if (!this.props.usersByUid[thread.updatedBy] && thread.createdBy !== thread.updatedBy) {
  	      this.db.collection("users").doc(thread.updatedBy).get().then(userDoc => {
  	        this.props.addUserByUid(thread.updatedBy, userDoc.data());
  	      });
	      }
	    });
		});
	}
	componentWillUnmount = () => {
		this.unsubscribe();
	}
	handleSubmitThread = (e) => {
		e.preventDefault();
		const time = Date.now()
		this.db.collection("posts").add({
			uid: this.props.user.uid,
	    content: this.contentRef.current.value,
	    createdTime: time
		})
		.then((docRef) => {
		    this.db.collection("threads").add({
			    createdBy: this.props.user.uid,
		      title: this.titleRef.current.value,
		      postIds: [docRef.id],
		      updatedBy: this.props.user.uid,
		      createdTime: time,
		      updatedTime: time
		    }).then((threadRef) => {
  				this.contentRef.current.value = '';
  				this.titleRef.current.value = '';
  				navigate(`/thread/${threadRef.id}`);
		    });
		});
	};
	render() {
	  if (!this.props.threadIds) {
			return (
			  <div className="thread-list-container">
		      <div className="loader loader-med"></div>
				</div>
			);
	  }
		return (
			<div className="thread-list-container">
			  <div className="section-header">Threads:</div>
				{this.props.threadIds.map((id) => {
				  const thread = this.props.threadsById[id];
				  if (!thread) {
				    return (
  						<div key={id} className="thread-row">
  				      <div className="loader loader-med"></div>
  						</div>
				    );
				  }
					return (
						<Link to={"thread/" + thread.id} key={thread.id} className="thread-row">
						  <div className="thread-title">
						    <span className="title-text">{thread.title}</span>
						    <span>started by</span>
  						  <span className="info">
  						    {this.props.usersByUid[thread.createdBy]
  						      ? this.props.usersByUid[thread.createdBy].displayName
  						      : '?'}
					      </span>
					    </div>
						  <div className="thread-meta">
  						  <span>last updated by</span>
  						  <span className="info">
  						    {this.props.usersByUid[thread.updatedBy]
  						      ? this.props.usersByUid[thread.updatedBy].displayName
  						      : '?'}
						      </span>
  						  <span>at</span>
  						  <span className="info">{format(thread.updatedTime, STANDARD_DATE_FORMAT)}</span>
						  </div>
						</Link>
					);
				})}
				<form className="new-post-container" onSubmit={this.handleSubmitThread}>
			    <div className="section-header">Start a new thread:</div>
					<div className="form-line">
					  <label>Thread title</label>
						<input ref={this.titleRef} className="title-input" placeholder="Title of new thread" />
					</div>
					<div className="form-line">
					  <label>First post</label>
						<textarea ref={this.contentRef} className="content-input" placeholder="Content of new post" />
					</div>
					<div className="form-line">
						<button>Post New Thread</button>
					</div>
				</form>
			</div>
		);
	}
}

export default ThreadList;
