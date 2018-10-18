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

export function updateThread(threadId, threadData, forumId) {
	const db = firebase.firestore();
	let forumUpdates = null;
	if (forumId && threadData.updatedBy) {
		forumUpdates = {
			updatedBy: threadData.updatedBy,
			updatedTime: threadData.updatedTime
		}
	}
	let requests = [];
	requests.push(db.collection("threads")
		.doc(threadId)
		.update(threadData));
	if (forumUpdates) {
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