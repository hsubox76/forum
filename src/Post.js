import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import { LOADING_STATUS, STANDARD_DATE_FORMAT } from './constants';

class Post extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
		this.db.settings({timestampsInSnapshots: true});
		this.state = { post: null };
		this.postUnsub = null;
	}
	componentDidMount = () => {
		this.postUnsub = this.db.collection("posts")
			.doc(this.props.postId)
			.onSnapshot(postDoc => {
				const post = postDoc.data();
				this.setState({ post: Object.assign(post, { id: postDoc.id }) });
				if (!this.props.usersByUid[post.uid]) {
					this.db.collection("users")
						.doc(post.uid)
						.get()
						.then(userDoc => {
							// store this up a level
							this.props.addUserByUid(post.uid, userDoc.data());
						});
				}
			});
	}
	componentWillUnmount = () => {
		this.postUnsub && this.postUnsub();
	}
	handleDeletePost = () => {
		this.postUnsub && this.postUnsub();
		this.setState({ status: LOADING_STATUS.DELETING });
		const deletePromises = [];
		deletePromises.push(
			this.db.collection("posts")
				.doc(this.props.postId)
				.delete()
				.then(() => console.log(`post ${this.props.postId} deleted`)));
		deletePromises.push(this.props.deletePostFromThread(this.props.postId));
		Promise.all(deletePromises)
			.then(() => {
				console.log(`Successfully deleted post ${this.props.postId}`);
			})
			.catch(e => this.setState({ status: LOADING_STATUS.PERMISSIONS_ERROR}));
	}
	renderContent = (content) => {
		const lines = content.split('\n');
		return lines.map((line, index) => <p key={index} className="content-line">{line}</p>);
	}
	render() {	
		const post = this.state.post;
		// TODO: Permissions error - popup - unlikely case though.
		if (this.state.status === LOADING_STATUS.DELETED) {
			// this shouldn't happen... but just in case
			return (
				<div key={this.props.postId} className="post-container">
					This post has been deleted.
				</div>
			);
		}
		if (!post || this.state.status === LOADING_STATUS.LOADING || this.state.status === LOADING_STATUS.DELETING) {
			return (
				<div key={this.props.postId} className="post-container">
					<div className="loader loader-med"></div>
				</div>
			);
		}
		return (
			<div key={post.id} className="post-container">
				<div className="post-header">
					<div className="post-user">
						{this.props.usersByUid[post.uid]
							? this.props.usersByUid[post.uid].displayName
							: <div className="loader loader-small"></div>}
					</div>
					<div className="post-date">
						{format(post.createdTime, STANDARD_DATE_FORMAT)}
					</div>
				</div>
				<div className="post-content">
					{this.renderContent(post.content)}
				</div>
				<div className="post-footer">
					<button
						className="small button-delete"
						onClick={this.handleDeletePost}>
							delete
					</button>
				</div>
			</div>
		);
	}
}

export default Post;
