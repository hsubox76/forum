import firebase from 'firebase/app';
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

export function getAllUsers() {
	const db = firebase.firestore();
	return db.collection("users")
		.get()
		.then(querySnapshot => {
			const users = [];
			querySnapshot.forEach(doc => users.push(
				Object.assign(doc.data(), { uid: doc.id })
			));
			return users;
		});
}

export function getAllInvites() {
	const db = firebase.firestore();
	return db.collection("invites")
		.get()
		.then(querySnapshot => {
			const invites = [];
			querySnapshot.forEach(doc => invites.push(
				Object.assign(doc.data(), { id: doc.id })
			));
			return invites;
		});
}

export function getAllInvitesFor(uid) {
	const db = firebase.firestore();
	return db.collection("invites")
		.where("createdByUid", "==", uid)
		.get()
		.then(querySnapshot => {
			const invites = [];
			querySnapshot.forEach(doc => invites.push(
				Object.assign(doc.data(), { id: doc.id })
			));
			return invites;
		});
}

export function generateInviteCode(createdByName, createdByUid) {
	const db = firebase.firestore();
	return db.collection("invites")
		.add({
			wasUsed: false,
			createdAt: Date.now(),
			createdByName: createdByName,
			createdByUid: createdByUid
		})
		.then(docRef => {
			return docRef.id;
		});
}

export function verifyAllUsers() {
	const db = firebase.firestore();
	return db.collection("users")
		.get()
		.then(querySnapshot => {
			querySnapshot.forEach(doc => {
				db.collection("users").doc(doc.id).update({
					verifiedWithCode: true,
					verifiedDate: Date.now()
				});
			});
		});
}

export function updateReaction(uid, postId, reactionType, shouldAdd) {
	const db = firebase.firestore();
	if (shouldAdd) {
		db.collection("posts").doc(postId).update({
			    [`reactions.${reactionType}`]: firebase.firestore.FieldValue.arrayUnion(uid)
		});
	} else {
		db.collection("posts").doc(postId).update({
			    [`reactions.${reactionType}`]: firebase.firestore.FieldValue.arrayRemove(uid)
		});
	}
}

export function updatePost(content, postIds, props) {
	const db = firebase.firestore();
	const now = Date.now();
	const postData = {
				uid: props.user.uid,
		    content,
		    parentThread: props.threadId,
		    createdTime: now,
		    updatedTime: now
	};
	if (postIds) {
		// new post
		return db.collection("posts").add(postData)
			.then((docRef) => {
				if (postIds) {
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
	} else {
		return db.collection("posts")
			.doc(props.postId)
			.update(postData);
	}
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