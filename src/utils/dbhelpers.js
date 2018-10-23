import firebase from 'firebase';
import 'firebase/firestore';

export function getForum(props) {
	const db = firebase.firestore();
	const forum = props.forumsById[props.forumId];
  if (!forum) {
	  return db.collection("forums")
	    .doc(props.forumId)
	    .get()
	    .then(doc => {
	      props.setForumData(
	        null,
	        Object.assign(
	          {}, props.forumsById, { [props.forumId]: doc.data() }
          )
        );
	    });
  }
}

export function getUser(props, uid) {
	const db = firebase.firestore();
	if (props.usersByUid[uid]) {
		return Promise.resolve(props.usersByUid[uid]);
	} else {
		return db.collection("users")
			.doc(uid)
			.get()
			.then(userDoc => {
				// store this up a level
				props.addUserByUid(uid, userDoc.data());
				return userDoc.data();
			});
	}
}

export function updatePost(content, postIds, props, onDone) {
	const db = firebase.firestore();
	const now = Date.now();
	db.collection("posts").add({
				uid: props.user.uid,
		    content,
		    parentThread: props.threadId,
		    createdTime: now,
		    updatedTime: now
	})
	.then((docRef) => {
		onDone();
		if (postIds) {
			// this means it was a new post
			updateThread(props.threadId, {
				updatedTime: now,
				updatedBy: props.user.uid,
				postIds: postIds.concat(docRef.id),
				['readBy.' + props.user.uid]: now
			}, props.forumId, {
				['readBy.' + props.user.uid]: now
			});
		}
    console.log("Document written with ID: ", docRef.id);
	});
}

export function updateThread(threadId, threadData, forumId, forumData) {
	const db = firebase.firestore();
	let requests = [];
	
	requests.push(db.collection("threads")
		.doc(threadId)
		.update(threadData));
		
	if (forumId) {
		const forumUpdates = forumData || {};
		if (threadData.updatedBy) {
			forumUpdates.updatedBy = threadData.updatedBy;
			forumUpdates.updatedTime = threadData.updatedTime;
		}
		requests.push(updateForum(forumId, forumUpdates));
	}
	return Promise.all(requests);
}

export function updateForum(forumId, forumData) {
	const db = firebase.firestore();
	return db.collection("forums")
		.doc(forumId)
		.update(forumData);
}

export function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}