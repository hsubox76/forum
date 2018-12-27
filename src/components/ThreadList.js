import React, { useEffect, useRef, useState, useContext } from 'react';
import '../styles/Posts.css';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { format } from 'date-fns';
import get from 'lodash/get';
import { Link, navigate } from "@reach/router"
import {
  COMPACT_DATE_FORMAT,
  STANDARD_DATE_FORMAT,
  LOADING_STATUS,
  POSTS_PER_PAGE } from '../utils/constants';
import UserContext from './UserContext';
import { getUser, updateForum } from '../utils/dbhelpers';
import { useForum } from '../utils/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function ThreadList(props) {
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [threads, setThreads] = useState([]);
  const [isHoveringOnLast, setIsHoveringOnLast] = useState(false);
  const contentRef = useRef();
  const titleRef  = useRef();
  const context = useContext(UserContext);

  function handleSubmitThread(e) {
    e.preventDefault();
    const time = Date.now()
    firebase.firestore().collection("posts").add({
      uid: props.user.uid,
      content: contentRef.current.value,
      createdTime: time
    })
    .then((docRef) => {
      firebase.firestore().collection("threads").add({
        createdBy: props.user.uid,
        title: titleRef.current.value,
        postIds: [docRef.id],
        updatedBy: props.user.uid,
        createdTime: time,
        updatedTime: time,
        forumId: props.forumId,
        priority: 0,
        isSticky: false
      }).then((threadRef) => {
        contentRef.current.value = '';
        titleRef.current.value = '';
        updateForum(props.forumId, {
          updatedBy: props.user.uid,
          updatedTime: time
        });
        navigate(`/forum/${props.forumId}/thread/${threadRef.id}`);
      });
    });
  }

  const forum = useForum(props.forumId);

  useEffect(() => {
    const unsub = firebase.firestore().collection("threads")
      .where("forumId", "==", props.forumId)
      .orderBy("priority", "desc")
      .orderBy("updatedTime", "desc")
      .onSnapshot((querySnapshot) => {
        const threadList = [];
        setStatus(LOADING_STATUS.LOADED);
        querySnapshot.forEach((doc) => {
          const thread = Object.assign(doc.data(), { id: doc.id });
          threadList.push(thread);
          if (!context.usersByUid[thread.createdBy]) {
            context.addUserByUid(thread.createdBy, {});
            getUser(thread.createdBy).then(user => context.addUserByUid(user.uid, user));
          }
          if (!context.usersByUid[thread.updatedBy]) {
            context.addUserByUid(thread.updatedBy, {});
            getUser(thread.updatedBy).then(user => context.addUserByUid(user.uid, user));
          }
        });
      setThreads(threadList);
    });
    return unsub;
  }, [props.forumId]);
  
  if (!forum || !threads || status === LOADING_STATUS.LOADING) {
    return (
      <div className="thread-list-container">
        <div className="loader loader-med"></div>
      </div>
    );
  }
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const dateFormat = isMobile
    ? COMPACT_DATE_FORMAT
    : STANDARD_DATE_FORMAT;
  return (
    <div className="thread-list-container">
      <div className="section-header">
        <div>
          <Link className="thread-label" to="/">
            Home
          </Link>
          <span className="title-caret">&gt;</span>
          <span className="thread-title">{(forum && forum.name) || ''}</span>
        </div>
      </div>
      {threads.map((thread) => {
        if (!thread) {
          return (
            <div key={thread.id} className="thread-row">
              <div className="loader loader-med"></div>
            </div>
          );
        }
        const isUnread = thread.updatedTime > (get(thread, ['readBy', props.user.uid]) || 0);
        const threadClasses = ['thread-row'];
        let link = "thread/" + thread.id;
        if (isUnread) {
          threadClasses.push('unread');
        }
        if (isUnread || isHoveringOnLast) {
          link += `?posts=${POSTS_PER_PAGE}&page=last`;
        }
        return (
          <Link to={link} key={thread.id} className={threadClasses.join(' ')}>
            <div className="thread-title">
              <div className="title-container">
                {thread.priority > 0
                  && <FontAwesomeIcon className="icon" icon="thumbtack" />}
                {isUnread
                  && <FontAwesomeIcon className="icon icon-comment" icon="comment" />}
                <span className="title-text">{thread.title}</span>
                <span
                  className="title-page-link"
                >
                  start
                </span>
                <span
                  onMouseEnter={() => setIsHoveringOnLast(true)}
                  onMouseLeave={() => setIsHoveringOnLast(false)}
                  className="title-page-link"
                >
                  end
                </span>
              </div>
              <div>
                <span>started by</span>
                <span className="info truncatable-name">
                  {get(context.usersByUid[thread.createdBy], 'displayName') || '?'}
                </span>
              </div>
            </div>
            <div className="thread-meta">
              <div className="post-count">
                <span className="post-num">{thread.postIds.length}</span> posts</div>
              <div className="last-updated-info">
                <span>last updated by</span>
                <span className="info truncatable-name">
                  {get(context.usersByUid[thread.updatedBy], 'displayName') || '?'}
                </span>
                {!isMobile && <span>at</span>}
                <span className="info">{format(thread.updatedTime, dateFormat)}</span>
              </div>
            </div>
          </Link>
        );
      })}
      <form className="new-post-container" onSubmit={handleSubmitThread}>
        <div className="section-header">Start a new thread:</div>
        <div className="form-line">
          <label>Thread title</label>
          <input ref={titleRef} className="title-input" placeholder="Title of new thread" />
        </div>
        <div className="form-line">
          <label>First post</label>
          <textarea ref={contentRef} className="content-input" placeholder="Content of new post" />
        </div>
        <div className="form-line">
          <button>Post New Thread</button>
        </div>
      </form>
    </div>
  );
}

export default ThreadList;
