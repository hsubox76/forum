import React, { Component } from 'react';
import './PostList.css';
import firebase from 'firebase';
import 'firebase/firestore';

class PostList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.state = { posts: null };
	}
	componentDidMount = () => {
		this.db.collection("posts").onSnapshot((querySnapshot) => {
			const posts = [];
	    querySnapshot.forEach((doc) => {
	    		posts.push(Object.assign(doc.data(), { id: doc.id }));
	    });
	    this.setState({ posts });
		});
	}
	handleSubmitPost = (e) => {
		e.preventDefault();
		this.db.collection("posts").add({
			user: this.state.user || 'unknown',
	    content: this.contentRef.current.value,
	    createdTime: Date.now()
		})
		.then(function(docRef) {
		    console.log("Document written with ID: ", docRef.id);
		});
	};
	render() {
		return (
			<div className="post-list-container">
				{!this.state.posts && "loading"}
				{this.state.posts && this.state.posts.map((post) => {
					return (
						<div key={post.id} className="post-container">
							<div className="post-line">user: {post.user}</div>
							<div className="post-line">content: {post.content}</div>
							<div className="post-line">created: {post.createdTime}</div>
						</div>
					);
				})}
				<form className="new-post-container" onSubmit={this.handleSubmitPost}>
					<div className="form-line">
						<textarea ref={this.contentRef} />
						<button>Post</button>
					</div>
				</form>
			</div>
		);
	}
}

export default PostList;
