import React, { useRef, useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import { Link, navigate } from "@reach/router";
import {
  COMPACT_DATE_FORMAT,
  STANDARD_DATE_FORMAT,
  LOADING_STATUS,
  POSTS_PER_PAGE,
  THREADS_PER_PAGE,
} from "../utils/constants";
import UserData from "./UserData";
import {
  addDoc,
  updateDoc,
  getUsers,
  updateForumNotifications,
} from "../utils/dbhelpers";
import {
  useSubscribeToCollection,
  useSubscribeToDocumentPath,
} from "../utils/hooks";
import { getParams, getPostRange } from "../utils/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare, faCheckSquare } from "@fortawesome/free-regular-svg-icons";
import UserContext from "./UserContext";
import PaginationControl from "./pagination-control";

function ThreadList(props) {
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [userMap, setUserMap] = useState({});
  const contentRef = useRef();
  const titleRef = useRef();
  const context = useContext(UserContext);

  const forum = useSubscribeToDocumentPath(`forums/${props.forumId}`);

  const threads = useSubscribeToCollection(`forums/${props.forumId}/threads`, [
    { orderBy: ["priority", "desc"] },
    { orderBy: ["updatedTime", "desc"] },
  ]);

  useEffect(() => {
    let unmounting = false;
    if (threads) {
      const uids = uniq(
        flatten(
          threads.map((thread) => [thread.createdBy, thread.updatedBy])
        ).filter((uid) => uid)
      ).sort();
      getUsers(uids, context).then((users) => !unmounting && setUserMap(users));
    }
    return () => {
      unmounting = true;
    };
  }, [threads, context]);

  async function handleSubmitThread(e) {
    e.preventDefault();
    const time = Date.now();
    const threadRef = await addDoc(`forums/${props.forumId}/threads`, {
      createdBy: props.user.uid,
      title: titleRef.current.value,
      updatedBy: props.user.uid,
      postCount: 1,
      createdTime: time,
      updatedTime: time,
      forumId: props.forumId,
      priority: 0,
      isSticky: false,
    });
    await addDoc(`forums/${props.forumId}/threads/${threadRef.id}/posts`, {
      uid: props.user.uid,
      content: contentRef.current.value,
      createdTime: time,
    });
    contentRef.current.value = "";
    titleRef.current.value = "";
    //TODO: Update updated times with cloud functions
    updateDoc(`forums/${props.forumId}`, {
      updatedBy: props.user.uid,
      updatedTime: time,
    });
    navigate(`/forum/${props.forumId}/thread/${threadRef.id}`);
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
      <div className="page-center">
        <div className="loader loader-med" />
      </div>
    );
  }
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const dateFormat = isMobile ? COMPACT_DATE_FORMAT : STANDARD_DATE_FORMAT;

  const params = getParams(props.location.search);
  const threadsPerPage = params.threads || THREADS_PER_PAGE;
  const pageString = params.page || 0;
  const { start, end, numPages, page } = getPostRange(
    pageString,
    threadsPerPage,
    threads.length
  );
  const threadList = threads
    ? threads.slice(start, end).map((thread, index) =>
        Object.assign(thread, {
          index: index + start,
        })
      )
    : [];
  //TODO: should be able to pass postdata straight to post and not have to reload it

  const paginationBox = (
    <PaginationControl
      linkRoot={`/forum/${props.forumId}`}
      type="thread"
      numPages={numPages}
      itemsPerPage={threadsPerPage}
      page={page}
    />
  );

  function toggleNotifications() {
    if (!props.userSettings) return;
    const notificationsOn = props.userSettings.notifications.forums.includes(
      props.forumId
    );
    updateForumNotifications(props.user.uid, props.forumId, notificationsOn);
  }

  return (
    <div className="container w-4/5 mx-auto">
      <h1>
        <div className="flex space-x-2">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <span className="font-normal">{(forum && forum.name) || ""}</span>
        </div>
      </h1>
      <div className="my-2 flex space-x-2 items-center text-lg border-2 border-ok px-2 rounded">
        <button onClick={toggleNotifications}>
          {props.userSettings &&
          props.userSettings.notifications.forums.includes(props.forumId) ? (
            <FontAwesomeIcon className="text-ok" icon={faCheckSquare} />
          ) : (
            <FontAwesomeIcon className="text-ok" icon={faSquare} />
          )}
        </button>
        <div>Send me an email on any new post in this forum.</div>
      </div>
      {paginationBox}
      {threadList.map((thread) => {
        if (!thread) {
          return (
            <div key={thread.id} className="row-item">
              <div className="loader loader-med" />
            </div>
          );
        }
        const isUnread =
          thread.unreadBy && thread.unreadBy.includes(props.user.uid);
        const threadClasses = ["row-item"];
        let link = `/forum/${props.forumId}/thread/${thread.id}`;
        if (isUnread) {
          threadClasses.push("unread");
        }
        const firstPageLink = (link += `?posts=${POSTS_PER_PAGE}&page=0`);
        const lastPageLink = (link += `?posts=${POSTS_PER_PAGE}&page=last`);
        if (isUnread) {
          link = lastPageLink;
        }
        return (
          <div
            onClick={(e) => handleClickThread(e, link)}
            key={thread.id}
            className={threadClasses.join(" ")}
          >
            <div>
              <div className="flex items-center space-x-1">
                {thread.priority > 0 && (
                  <FontAwesomeIcon className="text-main" icon="thumbtack" />
                )}
                {isUnread && (
                  <FontAwesomeIcon className="text-main" icon="comment" />
                )}
                <Link to={link} className="text-main font-medium">
                  {thread.title}
                </Link>
                <Link
                  to={firstPageLink}
                  className="text-sm text-main underline"
                >
                  start
                </Link>
                <Link to={lastPageLink} className="text-sm text-main underline">
                  end
                </Link>
              </div>
              <div className="flex text-sm space-x-1">
                <span>started by</span>
                <span className="text-ok font-medium truncate">
                  <UserData user={userMap[thread.createdBy]} />
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end text-sm">
              {thread.postCount && (
                <div>
                  <span className="text-main font-medium">
                    {thread.postCount}
                  </span>{" "}
                  posts
                </div>
              )}
              <div className="flex space-x-1">
                <span>last updated by</span>
                <span className="text-ok font-medium">
                  <UserData user={userMap[thread.updatedBy]} />
                </span>
                {!isMobile && <span>at</span>}
                <span className="text-main font-medium">
                  {format(thread.updatedTime, dateFormat)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <form
        className="container mt-4 border-t-2 border-main"
        onSubmit={handleSubmitThread}
      >
        <h1>Start a new thread:</h1>
        <div className="flex flex-col my-1">
          <label htmlFor="threadTitle">Thread title</label>
          <input
            id="threadTitle"
            ref={titleRef}
            className="border border-neutral p-2 rounded"
            placeholder="Title of new thread"
          />
        </div>
        <div className="flex flex-col my-1">
          <label htmlFor="postContent">First post</label>
          <textarea
            id="postContent"
            ref={contentRef}
            className="border border-neutral p-2 rounded h-64"
            placeholder="Content of new post"
          />
        </div>
        <div className="my-2">
          <button className="btn btn-ok">Post New Thread</button>
        </div>
      </form>
    </div>
  );
}

export default ThreadList;
