import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import get from 'lodash/get';
import TextContent from './TextContent';
import { LOADING_STATUS, STANDARD_DATE_FORMAT } from '../utils/constants';

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
				if (!post) {
					return;
				}
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
				.then(() => {
					//TODO: update thread "last updated" info
					this.setState({ status: LOADING_STATUS.LOADED });
					this.props.toggleEditPost(this.props.postId);
				});
	}
	toggleEditMode = () => {
		if (this.state.status === LOADING_STATUS.EDITING) {
			this.setState({ status: LOADING_STATUS.LOADED });
		} else {
			this.setState({ status: LOADING_STATUS.EDITING });
		}
		this.props.toggleEditPost(this.props.postId);
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
		let footer = null;
		if (this.props.isAdmin || this.props.user.uid === post.uid) {
			if (this.state.status === LOADING_STATUS.EDITING) {
				footer = (
					<div className="post-footer">
						<button
							className="small button-cancel"
							disabled={this.state.status === LOADING_STATUS.SUBMITTING}
							onClick={this.toggleEditMode}>
								cancel
						</button>
						<button
							className="small button-edit"
							disabled={this.state.status === LOADING_STATUS.SUBMITTING}
							onClick={this.handleEditPost}>
								submit
						</button>
					</div>
				);
			} else {
				footer = (
					<div className="post-footer">
						<button
							className="small button-edit"
							disabled={this.props.isDisabled}
							onClick={this.toggleEditMode}>
								edit
						</button>
						<button
							className="small button-delete"
							disabled={this.props.isDisabled}
							onClick={this.props.isOnlyPost ? this.props.deleteThread : this.handleDeletePost}>
								delete
						</button>
					</div>
				);
			}
		}
		const classes = ['post-container'];
		if (this.state.status === LOADING_STATUS.EDITING) {
			classes.push('editing');
		}
		if (this.props.isDisabled) {
			classes.push('disabled');
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
					{this.state.status === LOADING_STATUS.EDITING ? (
							<form className="edit-post-container" onSubmit={this.handleEditPost}>
								<textarea ref={this.contentRef} className="content-input" defaultValue={post.content} />
							</form>
						) : (
							<TextContent content={post.content} />
						)
					}
				</div>
				{post.updatedBy &&
					<div className="post-edited">
						<span>Last edited</span>
						<span className="edit-data">{format(post.updatedTime, STANDARD_DATE_FORMAT)}</span>
						<span>by</span>
						<span className="edit-data">{get(this.props.usersByUid, [post.updatedBy, 'displayName']) || ''}</span>
					</div>}
				{footer}
			</div>
		);
	}
}

export default Post;
