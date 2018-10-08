import React, { Component } from 'react';
import './Posts.css';
import Post from './Post.js';
import firebase from 'firebase';
import 'firebase/firestore';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.unsubscribeList = [];
		this.state = {};
	}
	componentDidMount = () => {
		const threadSub = this.db.collection("threads")
			.doc(this.props.threadId)
			.onSnapshot(threadDoc => {
				this.setState({ thread: threadDoc.data() });
			});
			this.unsubscribeList.push(threadSub);
	}
	componentWillUnmount = () => {
		this.unsubscribeList.forEach(unsub => unsub());
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
	renderContent = (content) => {
		const lines = content.split('\n');
		return lines.map((line, index) => <p key={index} className="content-line">{line}</p>);
	}
	render() {
	  if (!this.state.thread) {
			return (
			  <div className="post-list-container">
		      <div className="loader loader-med"></div>
				</div>
			);
	  }
		return (
			<div className="post-list-container">
			  <div className="section-header">
			  	Thread: <span className="thread-title">{this.state.thread.title}</span>
			  </div>
				{!this.state.thread.postIds && "loading"}
				{this.state.thread.postIds && this.state.thread.postIds.map((postId) => (
					<Post
						postId={postId}
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
