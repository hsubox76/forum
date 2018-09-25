import React, { Component } from 'react';
import './PostList.css';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.state = { posts: null };
	}
	componentDidMount = () => {
		this.unsubscribe = this.db.collection("posts")
		.orderBy("createdTime")
		.onSnapshot((querySnapshot) => {
			const posts = [];
			const uids = {};
			const usersByUid = {};
			const promises = [];
	    querySnapshot.forEach((doc) => {
	    	if (doc.data().uid) {
	    		posts.push(Object.assign(doc.data(), { id: doc.id }));
	    		uids[doc.data().uid] = true;
	    	}
	    });
	    Object.keys(uids).forEach(uid => {
	    	promises.push(this.db.collection("users").doc(uid).get().then(doc => usersByUid[uid] = doc.data()));
	    });
	    Promise.all(promises).then(() => {
	    	posts.forEach(post => post.userInfo = usersByUid[post.uid]);
	    	this.setState({ posts });
	    });
		});
	}
	componentWillUnmount = () => {
		this.unsubscribe();
	}
	handleSubmitPost = (e) => {
		e.preventDefault();
		this.db.collection("posts").add({
			uid: this.props.user.uid,
	    content: this.contentRef.current.value,
	    createdTime: Date.now()
		})
		.then((docRef) => {
				this.contentRef.current.value = '';
		    console.log("Document written with ID: ", docRef.id);
		});
	};
	renderContent = (content) => {
		const lines = content.split('\n');
		return lines.map(line => <p className="content-line">{line}</p>);
	}
	render() {
		return (
			<div className="post-list-container">
				{!this.state.posts && "loading"}
				{this.state.posts && this.state.posts.map((post) => {
					return (
						<div key={post.id} className="post-container">
							<div className="post-line">
								<div className="post-field-label">
									user:
								</div>
								<div className="post-field-value">
									{post.userInfo.displayName}
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
									{format(post.createdTime, 'hh:mm a ddd MMM DD, YYYY')}
								</div>
							</div>
						</div>
					);
				})}
				<form className="new-post-container" onSubmit={this.handleSubmitPost}>
					<div className="form-line">
						<textarea ref={this.contentRef} className="content-input" />
					</div>
					<div className="form-line">
						<button>Add Post</button>
					</div>
				</form>
			</div>
		);
	}
}

export default PostList;
