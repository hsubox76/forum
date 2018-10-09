import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import get from 'lodash/get';
import { LOADING_STATUS, STANDARD_DATE_FORMAT } from './constants';

class Post extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
		this.db.settings({timestampsInSnapshots: true});
		this.state = { post: null };
		this.contentRef = React.createRef();
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
		this.props.setDialog({
			message: 'Sure you want to delete this post?',
			okText: 'delete',
			okClass: 'delete',
			onOk: this.deletePost
		});
	};
	deletePost = () => {
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
	handleEditPost = () => {
		this.setState({ status: LOADING_STATUS.SUBMITTING });
		this.db.collection("posts")
				.doc(this.props.postId)
				.update({
					updatedBy: this.props.user.uid,
			    content: this.contentRef.current.value,
			    updatedTime: Date.now()
				})
				.then(() => console.log(`post ${this.props.postId} deleted`));
	}
	toggleEditMode = () => {
		if (this.state.status === LOADING_STATUS.EDITING) {
			this.setState({ status: LOADING_STATUS.LOADED });
		} else {
			this.setState({ status: LOADING_STATUS.EDITING });
		}
	}
	renderContent = (content) => {
		if (this.state.status === LOADING_STATUS.EDITING) {
			return (
				<form className="edit-post-container" onSubmit={this.handleEditPost}>
					<textarea ref={this.contentRef} className="content-input">
					{content}
					</textarea>
				</form>
			);
		}
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
		let footer = (
			<div className="post-footer">
				<button
					className="small button-edit"
					onClick={this.toggleEditMode}>
						edit
				</button>
				<button
					className="small button-delete"
					onClick={this.props.isOnlyPost ? this.props.deleteThread : this.handleDeletePost}>
						delete
				</button>
			</div>
		);
		if (this.state.status === LOADING_STATUS.EDITING) {
			footer = (
				<div className="post-footer">
					<button
						className="small"
						onClick={this.toggleEditMode}>
							cancel
					</button>
					<button
						className="small button-edit"
						onClick={this.handleEditPost}>
							submit
					</button>
				</div>
			);
		}
		const classes = ['post-container'];
		if (this.state.status === LOADING_STATUS.EDITING) {
			classes.push('editing');
		}
		return (
			<div key={post.id} className={classes.join(' ')}>
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
				{post.updatedBy &&
					<div className="post-edited">
						<span>Last edited</span>
						<span className="edit-data">{format(post.updatedTime, STANDARD_DATE_FORMAT)}</span>
						<span>by</span>
						<span className="edit-data">{get(this.props.usersByUid, [post.updatedBy, 'displayName']) || ''}</span>
					</div>}
				{this.props.user.isAdmin && footer}
			</div>
		);
	}
}

export default Post;
