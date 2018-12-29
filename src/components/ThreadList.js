import React, { useRef, useState } from 'react';
import '../styles/Posts.css';
import { format } from 'date-fns';
import { Link, navigate } from "@reach/router"
import {
  COMPACT_DATE_FORMAT,
  STANDARD_DATE_FORMAT,
  LOADING_STATUS,
  POSTS_PER_PAGE } from '../utils/constants';
import UserData from './UserData';
import { addDoc, updateDoc } from '../utils/dbhelpers';
import { useSubscribeToCollection, useSubscribeToDocumentPath } from '../utils/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function ThreadList(props) {
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [isHoveringOnLast, setIsHoveringOnLast] = useState(false);
  const contentRef = useRef();
  const titleRef  = useRef();

  function handleSubmitThread(e) {
    e.preventDefault();
    const time = Date.now();
    addDoc(`forums/${props.forumId}/threads`, {
      createdBy: props.user.uid,
      title: titleRef.current.value,
      updatedBy: props.user.uid,
      createdTime: time,
      updatedTime: time,
      forumId: props.forumId,
      priority: 0,
      isSticky: false
    }).then(async (threadRef) => {
      await addDoc(`forums/${props.forumId}/threads/${threadRef.id}/posts`, {
        uid: props.user.uid,
        content: contentRef.current.value,
        createdTime: time
      });
      return threadRef;
    }).then((threadRef) => {
      contentRef.current.value = '';
      titleRef.current.value = '';
      //TODO: Update updated times with cloud functions
      updateDoc(`forums/${props.forumId}`, {
        updatedBy: props.user.uid,
        updatedTime: time
      });
      navigate(`/forum/${props.forumId}/thread/${threadRef.id}`);
    });
  }

  const forum = useSubscribeToDocumentPath(`forums/${props.forumId}`);

  const threads = useSubscribeToCollection(`forums/${props.forumId}/threads`,
    [
      { orderBy: ['priority', 'desc'] },
      { orderBy: ['updatedTime', 'desc'] }
    ]);

  if (forum && threads && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }
  
  if (status === LOADING_STATUS.LOADING) {
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
        const isUnread = thread.unreadBy && thread.unreadBy.includes(props.user.uid);
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
                  <UserData uid={thread.createdBy} />
                </span>
              </div>
            </div>
            <div className="thread-meta">
            {thread.postCount && (
              <div className="post-count">
                <span className="post-num">{thread.postCount}</span> posts
              </div>
            )}
              <div className="last-updated-info">
                <span>last updated by</span>
                <span className="info truncatable-name">
                  <UserData uid={thread.updatedBy} />
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
