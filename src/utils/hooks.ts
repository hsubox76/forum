import { useState, useEffect } from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import { createConverter } from "./dbhelpers";
import { QueryOption, UserAdminView } from "./types";

export function useSubscribeToDocumentPath<T extends { id: string }>(
  docPath: string
) {
  const [doc, updateDoc] = useState<T | null>(null);

  useEffect(() => {
    const converter = createConverter<T>();
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

  useEffect(() => {
    const converter = createConverter<T>();
    if (collectionName.includes("undefined")) return;
    const ref:
      | firebase.firestore.CollectionReference = firebase
      .firestore()
      .collection(collectionName);
    let query: firebase.firestore.Query | null = null;
    if (stringifiedOptions) {
      const opts: QueryOption[] = JSON.parse(stringifiedOptions);
      for (const opt of opts) {
        for (const key in opt) {
          const args = opt[key as keyof QueryOption];
          if (Array.isArray(args)) {
            // @ts-ignore
            query = ref[key as keyof QueryOption](...args).withConverter(converter);
          } else {
            query = ref[key as keyof QueryOption](args).withConverter(converter);
          }
        }
      }
    }
    if (!query) {
      query = ref.withConverter(converter);
    }
    const unsub = query.onSnapshot((querySnapshot) => {
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
  const [userSettings, setUserSettings] = useState<UserAdminView | null>(null);

  useEffect(() => {
    if (!uid) return;
    const converter = createConverter<UserAdminView>();
    const unsub = firebase
      .firestore()
      .doc(`users/${uid}`)
      .withConverter(converter)
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
