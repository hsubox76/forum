import React, { useRef, useState, useEffect, useContext } from "react";
import "../styles/Posts.css";
import { format } from "date-fns";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import { Link, navigate } from "@reach/router";
import {
  COMPACT_DATE_FORMAT,
  STANDARD_DATE_FORMAT,
  LOADING_STATUS,
  POSTS_PER_PAGE
} from "../utils/constants";
import UserData from "./UserData";
import { addDoc, updateDoc, getUsers } from "../utils/dbhelpers";
import {
  useSubscribeToCollection,
  useSubscribeToDocumentPath
} from "../utils/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import UserContext from "./UserContext";

function ThreadList(props) {
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [userMap, setUserMap] = useState({});
  const contentRef = useRef();
  const titleRef = useRef();
  const context = useContext(UserContext);

  const forum = useSubscribeToDocumentPath(`forums/${props.forumId}`);

  const threads = useSubscribeToCollection(`forums/${props.forumId}/threads`, [
    { orderBy: ["priority", "desc"] },
    { orderBy: ["updatedTime", "desc"] }
  ]);

  useEffect(
    () => {
      if (threads) {
        const uids = uniq(
          flatten(
            threads.map(thread => [thread.createdBy, thread.updatedBy])
          ).filter(uid => uid)
        ).sort();
        getUsers(uids, context).then(users => setUserMap(users));
      }
    },
    [threads]
  );

  function handleSubmitThread(e) {
    e.preventDefault();
    const time = Date.now();
    addDoc(`forums/${props.forumId}/threads`, {
      createdBy: props.user.uid,
      title: titleRef.current.value,
      updatedBy: props.user.uid,
      postCount: 1,
      createdTime: time,
      updatedTime: time,
      forumId: props.forumId,
      priority: 0,
      isSticky: false
    })
      .then(async threadRef => {
        await addDoc(`forums/${props.forumId}/threads/${threadRef.id}/posts`, {
          uid: props.user.uid,
          content: contentRef.current.value,
          createdTime: time
        });
        return threadRef;
      })
      .then(threadRef => {
        contentRef.current.value = "";
        titleRef.current.value = "";
        //TODO: Update updated times with cloud functions
        updateDoc(`forums/${props.forumId}`, {
          updatedBy: props.user.uid,
          updatedTime: time
        });
        navigate(`/forum/${props.forumId}/thread/${threadRef.id}`);
      });
  }

  function handleClickThread(e, link) {
    if (e.target.tagName !== "A") {
      props.navigate(link);
    }
  }

  if (forum && threads && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }

  if (status === LOADING_STATUS.LOADING) {
    return (
      <div className="thread-list-container">
        <div className="loader loader-med" />
      </div>
    );
  }
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const dateFormat = isMobile ? COMPACT_DATE_FORMAT : STANDARD_DATE_FORMAT;

  return (
    <div className="thread-list-container">
      <div className="section-header">
        <div>
          <Link className="thread-label" to="/">
            Home
          </Link>
          <span className="title-caret">&gt;</span>
          <span className="thread-title">{(forum && forum.name) || ""}</span>
        </div>
      </div>
      {threads.map(thread => {
        if (!thread) {
          return (
            <div key={thread.id} className="thread-row">
              <div className="loader loader-med" />
            </div>
          );
        }
        const isUnread =
          thread.unreadBy && thread.unreadBy.includes(props.user.uid);
        const threadClasses = ["thread-row"];
        let link = `/forum/${props.forumId}/thread/${thread.id}`;
        if (isUnread) {
          threadClasses.push("unread");
        }
        const lastPageLink = (link += `?posts=${POSTS_PER_PAGE}&page=last`);
        if (isUnread) {
          link = lastPageLink;
        }
        return (
          <div
            onClick={e => handleClickThread(e, link)}
            key={thread.id}
            className={threadClasses.join(" ")}
          >
            <div className="thread-title">
              <div className="title-container">
                {thread.priority > 0 && (
                  <FontAwesomeIcon className="icon" icon="thumbtack" />
                )}
                {isUnread && (
                  <FontAwesomeIcon
                    className="icon icon-comment"
                    icon="comment"
                  />
                )}
                <Link to={link} className="title-text">
                  {thread.title}
                </Link>
                <Link to={link} className="title-page-link">
                  start
                </Link>
                <Link to={lastPageLink} className="title-page-link">
                  end
                </Link>
              </div>
              <div>
                <span>started by</span>
                <span className="info truncatable-name">
                  <UserData user={userMap[thread.createdBy]} />
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
                  <UserData user={userMap[thread.updatedBy]} />
                </span>
                {!isMobile && <span>at</span>}
                <span className="info">
                  {format(thread.updatedTime, dateFormat)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <form className="new-post-container" onSubmit={handleSubmitThread}>
        <div className="section-header">Start a new thread:</div>
        <div className="form-line">
          <label>Thread title</label>
          <input
            ref={titleRef}
            className="title-input"
            placeholder="Title of new thread"
          />
        </div>
        <div className="form-line">
          <label>First post</label>
          <textarea
            ref={contentRef}
            className="content-input"
            placeholder="Content of new post"
          />
        </div>
        <div className="form-line">
          <button>Post New Thread</button>
        </div>
      </form>
    </div>
  );
}

export default ThreadList;
