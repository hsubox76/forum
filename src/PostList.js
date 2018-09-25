import React, { Component } from 'react';
import './Posts.css';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from './constants';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.state = { postsById: {}, usersByUid: {} };
		this.unsubscribeList = [];
	}
	componentDidMount = () => {
		const threadSub = this.db.collection("threads")
			.doc(this.props.threadId)
			.onSnapshot(threadDoc => {
				this.setState({ thread: threadDoc.data() });
				const postIds = threadDoc.data().postIds;
				const postsById = {};
				postIds.forEach(postId => {
					const postSub = this.db.collection("posts")
						.doc(postId)
						.onSnapshot(postDoc => {
							const post = postDoc.data();
							postsById[postDoc.id] = Object.assign(post, { id: postDoc.id });
							this.setState({ postsById });
							this.db.collection("users")
								.doc(post.uid)
								.get()
								.then(userDoc => {
	        				this.setState({
	        					usersByUid: Object.assign(
	        						this.state.usersByUid,
	        						{ [post.uid]: userDoc.data() })
	        				});
								});
						});
					this.unsubscribeList.push(postSub);
				});
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
			  <div className="section-header">Thread: <span className="thread-title">{this.state.thread.title}</span></div>
				{!this.state.thread.postIds && "loading"}
				{this.state.thread.postIds && this.state.thread.postIds.map((postId) => {
					const post = this.state.postsById[postId];
					if (!post) {
						return (
							<div key={postId} className="post-container">
  							<div className="loader loader-med"></div>
							</div>
						);
					}
					return (
						<div key={post.id} className="post-container">
							<div className="post-line">
								<div className="post-field-label">
									user:
								</div>
								<div className="post-field-value">
									{this.state.usersByUid[post.uid]
										? this.state.usersByUid[post.uid].displayName
										: <div className="loader loader-small"></div>}
								</div>
							</div>
							<div className="post-line">
								<div className="post-field-label">
									content:
								</div>
								<div className="post-field-value">
									{this.renderContent(post.content)}
								</div>
							</div>
							<div className="post-line">
								<div className="post-field-label">
									created:
								</div>
								<div className="post-field-value">
									{format(post.createdTime, STANDARD_DATE_FORMAT)}
								</div>
							</div>
						</div>
					);
				})}
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
