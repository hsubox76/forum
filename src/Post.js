import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from './constants';

class Post extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
		this.db.settings({timestampsInSnapshots: true});
		this.state = { post: null };
		this.unsubscribeList = [];
	}
	componentDidMount = () => {
		const postSub = this.db.collection("posts")
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
		this.unsubscribeList.push(postSub);
	}
	componentWillUnmount = () => {
		this.unsubscribeList.forEach(unsub => unsub());
	}
	renderContent = (content) => {
		const lines = content.split('\n');
		return lines.map((line, index) => <p key={index} className="content-line">{line}</p>);
	}
	render() {	
		const post = this.state.post;
		if (!post) {
			return (
				<div key={this.props.postId} className="post-container">
					<div className="loader loader-med"></div>
				</div>
			);
		}
		return (
			<div key={post.id} className="post-container">
				<div className="post-meta">
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
			</div>
		);
	}
}

export default Post;
