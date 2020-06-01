import { useState, useEffect } from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import { createConverter } from "./dbhelpers";
import { QueryOption } from "./types";

export function useSubscribeToDocumentPath<T extends { id: string }>(
  docPath: string
) {
  const [doc, updateDoc] = useState<T | null>(null);
  const converter = createConverter<T>();

  useEffect(() => {
    const unsub = firebase
      .firestore()
      .doc(docPath)
      .withConverter(converter)
      .onSnapshot((docRef) => {
        const docData = docRef.data();
        if (docData) {
          updateDoc(docData);
        }
      });
    return unsub;
  }, [docPath]);

  return doc;
}

export function useSubscribeToCollection<T extends { id: string }>(
  collectionName: string,
  options: Array<QueryOption>
) {
  const [collection, updateCollection] = useState<T[] | null>(null);
  const stringifiedOptions = JSON.stringify(options);
  const converter = createConverter<T>();

  useEffect(() => {
    if (collectionName.includes('undefined')) return;
    let ref = firebase.firestore().collection(collectionName);
    if (stringifiedOptions) {
      const opts: QueryOption[] = JSON.parse(stringifiedOptions);
      for (const key in opts) {
        const val = opts[key];
        if (Array.isArray(val)) {
          // @ts-ignore
          ref = ref[prop](...val);
        } else {
          // @ts-ignore
          ref = ref[prop](val);
        }
      }
    }
    ref = ref.withConverter(converter);
    const unsub = ref.onSnapshot((querySnapshot) => {
      const docList: T[] = [];
      querySnapshot.forEach((doc) => {
        if (doc) {
          docList.push(doc.data() as T);
        }
      });
      updateCollection(docList);
    });
    return unsub;
  }, [collectionName, stringifiedOptions]);
  return collection;
}

export function useUserSettings(uid?: string) {
  const [userSettings, setUserSettings] = useState<{
    notifications: { forums: string[]; threads: string[]; all: boolean };
  } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = firebase
      .firestore()
      .doc(`users/${uid}`)
      .onSnapshot((docRef) => {
        const docData = docRef.data();
        if (!docData) {
          return;
        }
        setUserSettings(
          Object.assign(
            { notifications: { forums: [], threads: [], all: false } },
            docData
          )
        );
      });
    return unsub;
  }, [uid]);

  return userSettings;
}
