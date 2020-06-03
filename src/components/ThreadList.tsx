import React, { useRef, useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import { Link, navigate, RouteComponentProps } from "@reach/router";
import {
  COMPACT_DATE_FORMAT,
  STANDARD_DATE_FORMAT,
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
import {
  ForumFirestoreData,
  ThreadWriteFirestoreData,
  LOADING_STATUS,
  PostWriteFirestoreData,
  ThreadReadFirestoreData,
  UserAdminView,
  UserPublic,
} from "../utils/types";

interface ThreadListProps extends RouteComponentProps<{ forumId: string }> {
  user: firebase.User;
  userSettings: UserAdminView | null;
}

function ThreadList(props: ThreadListProps) {
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [userMap, setUserMap] = useState<{ [uid: string]: UserPublic}>({});
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const context = useContext(UserContext);

  const forum: ForumFirestoreData | null = useSubscribeToDocumentPath(
    `forums/${props.forumId}`
  );

  const threads:
    | ThreadReadFirestoreData[]
    | null = useSubscribeToCollection(`forums/${props.forumId}/threads`, [
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

  async function handleSubmitThread(e: React.FormEvent) {
    e.preventDefault();
    if (!contentRef.current?.value || !titleRef.current?.value) {
      //TODO: Make visible.
      console.error("Missing content.");
      return;
    }
    if (!props.forumId) {
      return;
    }
    const time = Date.now();
    const threadRef = await addDoc<ThreadWriteFirestoreData>(
      `forums/${props.forumId}/threads`,
      {
        createdBy: props.user.uid,
        title: titleRef.current?.value || "",
        updatedBy: props.user.uid,
        postCount: 1,
        createdTime: time,
        updatedTime: time,
        forumId: props.forumId,
        priority: 0,
        isSticky: false,
      }
    );
    if (!threadRef) {
      //TODO: Make visible.
      console.error("Error creating thread.");
      return;
    }
    await addDoc<PostWriteFirestoreData>(
      `forums/${props.forumId}/threads/${threadRef.id}/posts`,
      {
        uid: props.user.uid,
        content: contentRef.current.value,
        createdTime: time,
        unreadBy: [],
        parentForum: props.forumId,
        parentThread: threadRef.id
      }
    );
    contentRef.current.value = "";
    titleRef.current.value = "";
    //TODO: Update updated times with cloud functions
    updateDoc(`forums/${props.forumId}`, {
      updatedBy: props.user.uid,
      updatedTime: time,
    });
    navigate(`/forum/${props.forumId}/thread/${threadRef.id}`);
  }

  function handleClickThread(e: React.MouseEvent, link: string) {
    if ((e.target as HTMLElement).tagName !== "A") {
      props.navigate?.(link);
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

  const params = getParams(props.location?.search);
  const threadsPerPage = params.threads || THREADS_PER_PAGE;
  const pageString = params.page || 0;
  const { start, end, numPages, page } = getPostRange(
    pageString,
    threadsPerPage,
    threads?.length || 0
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
    if (!props.userSettings || !props.forumId) return;
    const notificationsOn = props.userSettings.notifications?.forums?.includes(
      props.forumId
    ) || false;
    updateForumNotifications(props.user.uid, props.forumId, notificationsOn);
  }

  return (
    <div className="container w-full px-2 lg:px-0 lg:w-4/5 mx-auto">
      <h1>
        <div className="flex space-x-2">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <span className="font-normal">{(forum && forum.name) || ""}</span>
        </div>
      </h1>
      <div className="my-2 flex space-x-2 items-start lg:items-center text-lg border-2 border-ok px-2 rounded">
        <button onClick={toggleNotifications}>
          {props.userSettings && props.forumId &&
          props.userSettings.notifications?.forums?.includes(props.forumId) ? (
            <FontAwesomeIcon className="text-ok" icon={faCheckSquare} />
          ) : (
            <FontAwesomeIcon className="text-ok" icon={faSquare} />
          )}
        </button>
        <div>Send me an email on any new post in this forum.</div>
      </div>
      {paginationBox}
      {threadList.map((thread, index) => {
        if (!thread) {
          return (
            <div key={index} className="row-item">
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
        const firstPageLink = link + `?posts=${POSTS_PER_PAGE}&page=0`;
        const lastPageLink = link + `?posts=${POSTS_PER_PAGE}&page=last`;
        if (isUnread) {
          link = lastPageLink;
        }
        return (
          <div
            onClick={(e) => handleClickThread(e, link)}
            key={thread.id}
            className={threadClasses.join(" ")}
          >
            <div className="flex flex-col items-start justify-start">
              <div className="inline-block">
                {thread.priority > 0 && (
                  <FontAwesomeIcon className="text-main mr-1" icon="thumbtack" />
                )}
                {isUnread && (
                  <FontAwesomeIcon className="text-main mr-1" icon="comment" />
                )}
                <Link to={link} className="text-main font-medium">
                  {thread.title}
                </Link>
                <Link
                  to={firstPageLink}
                  className="text-sm text-main underline mx-1"
                >
                  start
                </Link>
                <Link to={lastPageLink} className="text-sm text-main underline mx-1">
                  end
                </Link>
              </div>
              <div className="flex text-sm flex-wrap lg:flex-no-wrap">
                <span className="mr-1">started by</span>
                <span className="text-ok font-medium truncate">
                  <UserData user={userMap[thread.createdBy]} />
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start lg:items-end text-sm">
              {thread.postCount && (
                <div>
                  <span className="text-main font-medium">
                    {thread.postCount}
                  </span>{" "}
                  posts
                </div>
              )}
              <div className="flex flex-col text-xs lg:text-sm lg:flex-row lg:space-x-1">
                <span>last updated by</span>
                <span className="text-ok font-medium my-0">
                  <UserData user={userMap[thread.updatedBy]} />
                </span>
                {!isMobile && <span>at</span>}
                <span className="text-main font-medium whitespace-no-wrap">
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
          <button className="btn btn-ok">
            Post New Thread
          </button>
        </div>
      </form>
    </div>
  );
}

export default ThreadList;
