import React, { Component } from 'react';
import './Posts.css';
import Post from './Post.js';
import { Link } from '@reach/router';
import firebase from 'firebase';
import 'firebase/firestore';
import { LOADING_STATUS } from './constants';
import without from 'lodash/without';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.threadUnsub = null;
		this.state = { status: LOADING_STATUS.LOADING };
	}
	componentDidMount = () => {
		this.threadUnsub = this.db.collection("threads")
			.doc(this.props.threadId)
			.onSnapshot(threadDoc => {
				this.setState({ thread: threadDoc.data(), status: LOADING_STATUS.LOADED });
			});
	}
	componentWillUnmount = () => {
		this.threadUnsub && this.threadUnsub();
	}
	handleDeleteThread = () => {
		this.threadUnsub && this.threadUnsub();
		this.setState({ status: LOADING_STATUS.DELETING });
		const deletePromises = [];
		this.state.thread.postIds.forEach(postId => {
			deletePromises.push(
				this.db.collection("posts")
					.doc(postId)
					.delete()
					.then(() => console.log(`post ${postId} deleted`)));
		});
		deletePromises.push(
			this.db.collection("threads")
				.doc(this.props.threadId)
				.delete()
				.then(() => console.log(`thread ${this.props.threadId} deleted`)));
		Promise.all(deletePromises)
			.then(() => {
				this.setState({ thread: null, status: LOADING_STATUS.DELETED });
			})
			.catch(e => this.setState({ status: LOADING_STATUS.PERMISSIONS_ERROR}));
	}
	handleSubmitPost = (e) => {
		e.preventDefault();
		const now = Date.now();
		this.db.collection("posts").add({
			uid: this.props.user.uid,
	    content: this.contentRef.current.value,
	    parentThread: this.props.threadId,
	    createdTime: now,
	    updatedTime: now
		})
		.then((docRef) => {
			this.contentRef.current.value = '';
			this.db.collection("threads")
				.doc(this.props.threadId)
				.update({
					postIds: this.state.thread.postIds.concat(docRef.id),
					updatedTime: now,
		      updatedBy: this.props.user.uid
				});
	    console.log("Document written with ID: ", docRef.id);
		});
	};
	handleDeletePostFromThread = (postId) => {
		return this.db.collection("threads")
			.doc(this.props.threadId)
			.update({
				postIds: without(this.state.thread.postIds, postId)
			});
	}
	renderContent = (content) => {
		const lines = content.split('\n');
		return lines.map((line, index) => <p key={index} className="content-line">{line}</p>);
	}
	render() {
		if (this.state.status === LOADING_STATUS.DELETING) {
			return (
			  <div className="page-message-container">
		      <div>deleting</div>
		      <div className="loader loader-med"></div>
				</div>
			);
		}
	  if (this.state.status === LOADING_STATUS.LOADING) {
			return (
			  <div className="page-message-container">
		      <div className="loader loader-med"></div>
				</div>
			);
	  }
		if (this.state.status === LOADING_STATUS.PERMISSIONS_ERROR) {
			return (
			  <div className="page-message-container">
		      <div>Sorry, you don't have permission to do that.</div>
		      <div><a href="#" onClick={() => this.setState({ status: LOADING_STATUS.LOADED })}>Back to thread.</a></div>
				</div>
			);
		}
		if (this.state.status === LOADING_STATUS.DELETED || !this.state.thread) {
			return (
			  <div className="page-message-container">
		      <div>This thread has been deleted.</div>
		      <div><Link to="/">Back to top.</Link></div>
				</div>
			);
		}
		return (
			<div className="post-list-container">
			  <div className="section-header">
			  	<div>
			  		<span className="thread-label">Thread:</span>
			  		<span className="thread-title">{this.state.thread.title}</span>
		  		</div>
		  		<div>
		  			{this.props.user.isAdmin &&
		  				<button className="button-delete" onClick={this.handleDeleteThread}>
		  					delete
	  					</button>
		  			}
		  		</div>
			  </div>
				{!this.state.thread.postIds && "loading"}
				{this.state.thread.postIds && this.state.thread.postIds.map((postId) => (
					<Post
						key={postId}
						postId={postId}
						user={this.props.user}
						deletePostFromThread={this.handleDeletePostFromThread}
						usersByUid={this.props.usersByUid}
						addUserByUid={this.props.addUserByUid}
					/>
				))}
				<form className="new-post-container" onSubmit={this.handleSubmitPost}>
					<div className="form-line">
					  <label>Add a post</label>
						<textarea ref={this.contentRef} className="content-input" placeholder="Type new post here" />
					</div>
					<div className="form-line">
						<button>Submit Post</button>
					</div>
				</form>
			</div>
		);
	}
}

export default PostList;
