import { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

export function useSubscribeToDocument(collection, docId) {
  const [doc, updateDoc] = useState(null);
  let unsub = null;
  
  useEffect(() => {
    unsub = firebase.firestore().collection(collection)
        .doc(docId)
        .onSnapshot(docRef => {
          const docData = docRef.data();
          if (!docData) {
            return;
          }
          updateDoc(Object.assign(docData, { id: docRef.id }));
        });
  }, [collection, docId]);
  
  return { doc, unsub };
}

export function useForum(forumId) {
  const [forum, setForum] = useState(null);

  useEffect(() => {
    let unsub = () => {};
    if (forumId) {
      unsub = firebase.firestore()
        .collection("forums")
        .doc(forumId)
        .onSnapshot(docRef => {
          if (!docRef.data()) return;
          setForum(docRef.data());
        });
    }
    return unsub;
  }, [forumId]);

  return forum;
}

export function useGetUser(uid) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (uid) {
      console.log('fetching uid', uid);
      const fetchUser = firebase.functions().httpsCallable('getUser');
      fetchUser({ uid }).then((response) => {
        setUser(response.data);
      });
    }
  }, [uid]);
  
  return user;
}
