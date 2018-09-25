import React, { Component } from 'react';
import './ThreadList.css';
import firebase from 'firebase';
import 'firebase/firestore';
import { format } from 'date-fns';

class ThreadList extends Component {
	constructor() {
		super();
		this.db = firebase.firestore();
	  this.db.settings({timestampsInSnapshots: true});
		this.contentRef = React.createRef();
		this.state = { threads: null };
	}
	componentDidMount = () => {
		this.unsubscribe = this.db.collection("threads")
		.orderBy("createdTime")
		.onSnapshot((querySnapshot) => {
			const threads = [];
			const uids = {};
			const usersByUid = {};
			const promises = [];
	    querySnapshot.forEach((doc) => {
	    	// if (doc.data().uid) {
	    		threads.push(Object.assign(doc.data(), { id: doc.id }));
	    	// 	uids[doc.data().uid] = true;
	    	// }
	    });
	   // Object.keys(uids).forEach(uid => {
	   // 	promises.push(this.db.collection("users").doc(uid).get().then(doc => usersByUid[uid] = doc.data()));
	   // });
	   // Promise.all(promises).then(() => {
	   // 	threads.forEach(post => post.userInfo = usersByUid[post.uid]);
	   // 	this.setState({ threads });
	   // });
	   this.setState({threads});
		});
	}
	componentWillUnmount = () => {
		this.unsubscribe();
	}
	handleSubmitPost = (e) => {
		// e.preventDefault();
		// this.db.collection("threads").add({
		// 	uid: this.props.user.uid,
	 //   content: this.contentRef.current.value,
	 //   createdTime: Date.now()
		// })
		// .then((docRef) => {
		// 		this.contentRef.current.value = '';
		//     console.log("Document written with ID: ", docRef.id);
		// });
	};
	render() {
		return (
			<div className="thread-list-container">
				{!this.state.threads && "loading"}
				{this.state.threads && this.state.threads.map((thread) => {
					return (
						<div key={thread.id} className="thread-row">
						  {thread.title}
						</div>
					);
				})}
				<form className="new-post-container" onSubmit={this.handleSubmitPost}>
					<div className="form-line">
						<input ref={this.titleRef} className="title-input" placeholder="Title of new thread" />
					</div>
					<div className="form-line">
						<button>Start New Thread</button>
					</div>
				</form>
			</div>
		);
	}
}

export default ThreadList;
