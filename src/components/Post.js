import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import get from 'lodash/get';
import findKey from 'lodash/findKey';
import TextContent from './TextContent';
import { LOADING_STATUS, STANDARD_DATE_FORMAT } from '../utils/constants';
import { getUser, updatePost, updateReaction } from '../utils/dbhelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const reactions = [
	{ faName: 'laugh-beam', desc: 'laugh' },
	{ faName: 'angry', desc: 'angry' },
	{ faName: 'surprise', desc: 'surprised' },
	{ faName: 'sad-tear', desc: 'sad' },
	{ faName: 'heart', desc: 'love' },
	{ faName: 'thumbs-up', desc: 'thumbs up' },
	{ faName: 'thumbs-down', desc: 'thumbs down' },
];

class ReactionButton extends Component {
	constructor() {
		super();
		this.state = { showTip: false };
	}
	handleClick = (userSelected) => {
		updateReaction(this.props.user.uid, this.props.postId, this.props.reaction.faName, !userSelected);
		if (this.props.currentReaction && !userSelected) {
			updateReaction(this.props.user.uid, this.props.postId, this.props.currentReaction, false);
		}
		this.setState({ showTip: false });
	}
	render() {
		const post = this.props.post;
		const responses = get(post, ['reactions', this.props.reaction.faName]) || [];
		const classes = ['reaction-button'];
		const userSelected = this.props.currentReaction === this.props.reaction.faName;
		if (userSelected) {
			classes.push('user-selected');
		}
		if (responses.length) {
			classes.push('has-count');
		}
		const tooltip = <div className="reaction-tooltip">{this.props.reaction.desc}</div>
		return (
			<button
				className={classes.join(' ')}
				onClick={() => this.handleClick(userSelected)}
				onMouseEnter={() => this.setState({ showTip: true })}
				onMouseLeave={() => this.setState({ showTip: false })}
			>
				{tooltip}
				<FontAwesomeIcon className="icon icon-reaction" icon={this.props.reaction.faName} size="lg" />
				{responses.length > 0 && <span className="reaction-count">{responses.length}</span>}
			</button>
		);
	}
}
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
				getUser(this.props, post.uid);
				if (this.props.isLastOnPage) {
					if (this.props.lastReadTime < post.createdTime) {
							this.updateReadOnClose =
								() => {
									this.props.updateLastRead(
										this.props.postId, post.updatedTime || post.createdTime);
								}
					}
				}
			});
	}
	componentWillUnmount = () => {
		this.postUnsub && this.postUnsub();
		this.updateReadOnClose && this.updateReadOnClose();
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
		updatePost(this.contentRef.current.value, null, this.props)
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
	renderAdminButtons = () => {
		const post = this.state.post;
		const adminButtons = [];
		if (this.state.status !== LOADING_STATUS.EDITING) {
			adminButtons.push(
				<button
					key="quote"
					className="small button-edit"
					disabled={this.state.status === LOADING_STATUS.SUBMITTING}
					onClick={() => this.props.handleQuote(post)}>
						quote
				</button>
			);
		}
		if (this.props.user.isAdmin || this.props.user.uid === post.uid) {
			if (this.state.status === LOADING_STATUS.EDITING) {
				adminButtons.push(
					<button
						key="cancel"
						className="small button-cancel"
						disabled={this.state.status === LOADING_STATUS.SUBMITTING}
						onClick={this.toggleEditMode}>
							cancel
					</button>
				);
				adminButtons.push(
					<button
						key="edit"
						className="small button-edit"
						disabled={this.state.status === LOADING_STATUS.SUBMITTING}
						onClick={this.handleEditPost}>
							submit
					</button>
				);
			} else {
				adminButtons.push(
					<button
						key="edit"
						className="small button-edit"
						disabled={this.props.isDisabled}
						onClick={this.toggleEditMode}>
							edit
					</button>
				);
				adminButtons.push(
					<button
						key="delete"
						className="small button-delete"
						disabled={this.props.isDisabled}
						onClick={this.props.isOnlyPost ? this.props.deleteThread : this.handleDeletePost}>
							delete
					</button>
				);
			}
		}
		return adminButtons;
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
		let currentReaction = null;
		if (post.reactions) {
			currentReaction = findKey(post.reactions, uids => uids.includes(this.props.user.uid));
		}
		const footer = (
			<div className="post-footer">
				<div className="reactions-container">
					{reactions.map(reaction => (
						<ReactionButton
							key={reaction.faName}
							currentReaction={currentReaction}
							reaction={reaction}
							post={this.state.post}
							{...this.props} />
						)
					)}
				</div>
				<div>{this.renderAdminButtons()}</div>
			</div>
		);
		const classes = ['post-container'];
		if (this.state.status === LOADING_STATUS.EDITING) {
			classes.push('editing');
		}
		if (this.props.isDisabled) {
			classes.push('disabled');
		}
		if (post.createdTime > (this.props.lastReadTime || 0)) {
			classes.push('unread');
		}
		const postUser = this.props.usersByUid[post.uid];
		return (
			<div key={post.id} className={classes.join(' ')}>
				<div className="post-header">
					<div className="post-user">
						{postUser && postUser.avatarUrl && <img className="avatar-post" alt="User's Avatar" src={postUser.avatarUrl} />}
						{postUser
							? postUser.displayName
							: <div className="loader loader-small"></div>}
					</div>
					<div className="post-header-right">
						<div>#{this.props.index}</div>
						<div className="post-date">{format(post.createdTime, STANDARD_DATE_FORMAT)}</div>
					</div>
				</div>
				<div className="post-content">
					{this.state.status === LOADING_STATUS.EDITING ? (
							<form className="edit-post-container" onSubmit={this.handleEditPost}>
								<textarea ref={this.contentRef} className="content-input" defaultValue={post.content} />
							</form>
						) : (
							<TextContent
								content={post.content}
								user={this.props.user}
								usersByUid={this.props.usersByUid}
								addUserByUid={this.props.addUserByUid}
							/>
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
