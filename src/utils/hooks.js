import { useState, useEffect } from 'react';

export function usePostDocument(db, collection, docId, props) {
	const [post, updatePost] = useState(null);
	let unsub = null;
	
	useEffect(() => {
		unsub = db.collection(collection)
				.doc(docId)
				.onSnapshot(postDoc => {
					const postData = postDoc.data();
					if (!postData) {
						return;
					}
					updatePost(Object.assign(postData, { id: postDoc.id }));
				});
	}, [collection, docId]);
	
	return { post, unsub };
}
