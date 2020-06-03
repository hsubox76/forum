import React, { useEffect, useRef, useState, useContext } from "react";
import Post from "./Post";
import { Link, navigate, RouteComponentProps } from "@reach/router";
import { POSTS_PER_PAGE } from "../utils/constants";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import {
  getCollection,
  deleteDoc,
  deleteCollection,
  updateDoc,
  addPost,
  getClaims,
  getUsers,
  addDoc,
  updateThreadNotifications,
} from "../utils/dbhelpers";
import { getParams, getPostRange } from "../utils/utils";
import {
  useSubscribeToDocumentPath,
  useSubscribeToCollection,
} from "../utils/hooks";
import UserContext from "./UserContext";
import PaginationControl from "./pagination-control";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare, faCheckSquare } from "@fortawesome/free-regular-svg-icons";
import {
  PostReadFirestoreData,
  ThreadReadFirestoreData,
  ForumFirestoreData,
  Claims,
  DialogData,
  LOADING_STATUS,
  PostDisplayData,
  UserAdminView,
} from "../utils/types";

interface PostListProps
  extends RouteComponentProps<{ forumId: string; threadId: string }> {
  user: firebase.User;
  setDialog: (data: DialogData) => void;
  userSettings: UserAdminView | null;
}

function PostList(props: PostListProps) {
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const newPostRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const context = useContext(UserContext);
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [postBeingEdited, setPostBeingEdited] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claims>({});
  const [userMap, setUserMap] = useState<{ [uid: string]: any }>({});
  const [threadTitleEditing, setThreadTitleEditing] = useState(false);

  const forum = useSubscribeToDocumentPath<ForumFirestoreData>(
    `forums/${props.forumId}`
  );
  const thread = useSubscribeToDocumentPath<ThreadReadFirestoreData>(
    `forums/${props.forumId}/threads/${props.threadId}`
  );

  let posts = useSubscribeToCollection<PostReadFirestoreData>(
    `forums/${props.forumId}/threads/${props.threadId}/posts`,
    [{ orderBy: "createdTime" }]
  );

  if (thread && posts && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }

  useEffect(() => {
    getClaims().then((claims) => setClaims(claims));
  }, [props.user]);

  useEffect(() => {
    if (posts) {
      const nestedUids: string[][] = posts.map((post) => {
        let uids: string[] = [post.uid];
        if (post.updatedBy) {
          uids.push(post.updatedBy);
        }
        if (post.reactions) {
          const reactionIds = Object.values(post.reactions);
          uids = uids.concat(flatten(reactionIds));
        }
        return uids || [];
      });
      const uids = uniq(flatten(nestedUids))
        .filter((uid) => uid)
        .sort();
      getUsers(uids, context).then((users) => setUserMap(users));
    }
  }, [posts, context]);

  if (!props.forumId || !props.threadId) {
    return null;
  }

  function handleDeleteThread() {
    if (!thread) return;
    props.setDialog({
      type: "dialog",
      message: "Sure you want to delete thread: " + thread.title + "?",
      okText: "delete",
      okClass: "danger",
      onOk: deleteThread,
    });
  }

  function handleMergeThread() {
    props.setDialog({
      type: "merge",
      forumId: props.forumId,
      threadId: props.threadId,
      onOk: mergeThread,
    });
  }

  function toggleEditThread() {
    setThreadTitleEditing(!threadTitleEditing);
  }

  function handleQuote({ content, uid }: { content: string; uid: string }) {
    if (!contentRef.current || !newPostRef.current) return;
    contentRef.current.value =
      `[quote uid=${uid}]${content}[/quote]\n` + contentRef.current.value;
    newPostRef.current.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!contentRef.current || !forum || !thread) return;
    await addPost(contentRef.current.value, forum, thread, props.user);
    if (!contentRef.current || !newPostRef.current) return;
    contentRef.current.value = "";
    navigate(
      `/forum/${props.forumId}` +
        `/thread/${props.threadId}` +
        `?page=last&posts=${POSTS_PER_PAGE}`
    );
    newPostRef.current.scrollIntoView({ behavior: "smooth" });
  }

  function handleSubmitTitle() {
    if (!titleRef.current || !thread || titleRef.current.value === thread.title)
      return;
    updateDoc(`forums/${props.forumId}/threads/${props.threadId}`, {
      title: titleRef.current.value,
    })
      .then(() => setThreadTitleEditing(false))
      .catch((e) => console.error(e));
  }

  function handleToggleEditPost(postId: string) {
    if (!postBeingEdited) {
      setPostBeingEdited(postId);
    } else {
      setPostBeingEdited(null);
    }
  }

  function deleteThread() {
    setStatus(LOADING_STATUS.DELETING);
    const deletePromises = [];
    deletePromises.push(
      deleteCollection(
        `forums/${props.forumId}/threads/${props.threadId}/posts`
      )
    );
    deletePromises.push(
      deleteDoc(`forums/${props.forumId}/threads/${props.threadId}`)
    );
    // TODO: Update forum based on latest updated thread remaining.
    Promise.all(deletePromises)
      .then(() => {
        setStatus(LOADING_STATUS.DELETED);
      })
      .catch((e) => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
  }

  const params = getParams(props.location?.search);
  const postsPerPage = params.posts || POSTS_PER_PAGE;
  const pageString = params.page || 0;
  const { start, end, numPages, page } = getPostRange(
    pageString,
    postsPerPage,
    posts?.length || 0
  );
  const postList: PostDisplayData[] = posts
    ? posts.slice(start, end).map((post, index) =>
        Object.assign(post, {
          index: index + start,
          createdByUser: userMap[post.uid],
          updatedByUser: post.updatedBy
            ? userMap[post.updatedBy]
            : userMap[post.uid],
        })
      )
    : [];
  //TODO: should be able to pass postdata straight to post and not have to reload it

  async function mergeThread(threadIdToMerge: string) {
    if (!posts) return;
    try {
      const listSnap = await getCollection<PostReadFirestoreData>(
        `forums/${props.forumId}/threads/${threadIdToMerge}/posts`
      );

      let newPosts: PostReadFirestoreData[] = [];
      let mergedPosts: PostReadFirestoreData[] = [];
      listSnap &&
        listSnap.forEach((postSnap) => newPosts.push(postSnap.data()));
      mergedPosts = newPosts
        .concat(posts.map((post) => Object.assign(post)))
        .sort((a, b) => {
          if (a.createdTime < b.createdTime) {
            return -1;
          } else if (a.createdTime > b.createdTime) {
            return 1;
          }
          return 0;
        });
      // add second thread's posts to this thread
      const postAddPromises = newPosts.map((post) => {
        if (!post.updatedBy) {
          post.updatedBy = post.uid;
        }
        return addDoc(
          `forums/${props.forumId}/threads/${props.threadId}/posts`,
          post
        );
      });
      const postUpdates = await Promise.all(postAddPromises).then(() => ({
        postCount: (posts?.length || 0) + newPosts.length,
        createdTime: mergedPosts[0].createdTime,
        createdBy: mergedPosts[0].uid,
      }));
      await updateDoc(
        `forums/${props.forumId}/threads/${props.threadId}`,
        postUpdates
      );
      // delete second thread
      const deletePromises = [];
      deletePromises.push(
        deleteCollection(
          `forums/${props.forumId}/threads/${threadIdToMerge}/posts`
        )
      );
      deletePromises.push(
        deleteDoc(`forums/${props.forumId}/threads/${threadIdToMerge}`)
      );
      await Promise.all(deletePromises);
    } catch (e) {
      console.error(e);
    }
    setStatus(LOADING_STATUS.LOADED);
  }

  if (status === LOADING_STATUS.DELETING) {
    return (
      <div className="page-center">
        <div>deleting</div>
        <div className="loader loader-med" />
      </div>
    );
  }
  if (status === LOADING_STATUS.LOADING) {
    return (
      <div className="page-center">
        <div className="loader loader-med" />
      </div>
    );
  }
  if (status === LOADING_STATUS.PERMISSIONS_ERROR) {
    return (
      <div className="page-center">
        <div>Sorry, you don't have permission to do that.</div>
        <div>
          <span onClick={() => setStatus(LOADING_STATUS.LOADED)}>
            Back to thread.
          </span>
        </div>
      </div>
    );
  }
  if (status === LOADING_STATUS.DELETED || !thread) {
    return (
      <div className="page-center">
        <div>This thread has been deleted.</div>
        <div>
          <Link to="/">Back to top.</Link>
        </div>
      </div>
    );
  }

  const paginationBox = (
    <PaginationControl
      linkRoot={`/forum/${props.forumId}/thread/${props.threadId}`}
      type="post"
      numPages={numPages}
      itemsPerPage={postsPerPage}
      page={page}
    />
  );

  function toggleNotifications() {
    if (!props.userSettings || !props.threadId) return;
    const notificationsOn =
      props.userSettings.notifications?.threads?.includes(props.threadId) ||
      false;
    updateThreadNotifications(props.user.uid, props.threadId, notificationsOn);
  }

  const threadTitle = threadTitleEditing ? (
    <div>
      <input
        ref={titleRef}
        className="title-edit-input"
        defaultValue={thread.title}
      />
      <button className="button-edit" onClick={handleSubmitTitle}>
        ok
      </button>
      <button className="button-cancel" onClick={toggleEditThread}>
        cancel
      </button>
    </div>
  ) : (
    <span className="thread-title">{thread.title}</span>
  );

  return (
    <div className="container w-full px-2 lg:px-0 lg:w-4/5 mx-auto">
      <div className="flex justify-between items-start my-2 flex-col lg:items-center lg:flex-row">
        <h1 className="flex flex-wrap breadcrumbs m-0">
          <Link to="/">
            Home
            <span className="mx-2">&gt;</span>
          </Link>
          <Link to={`/forum/${props.forumId}`}>
            {forum && forum.name}
            <span className="mx-2">&gt;</span>
          </Link>
          <span className="font-normal">{threadTitle}</span>
        </h1>
        {(claims.admin || claims.mod) && !threadTitleEditing && (
          <div className="flex space-x-2 my-2 lg:my-0">
            <button className="btn btn-neutral" onClick={handleMergeThread}>
              merge
            </button>
            <button className="btn btn-ok" onClick={toggleEditThread}>
              edit
            </button>
            <button className="btn btn-danger" onClick={handleDeleteThread}>
              delete
            </button>
          </div>
        )}
      </div>
      <div className="my-2 flex space-x-2 items-start lg:items-center text-lg border-2 border-ok px-2 rounded">
        <button onClick={toggleNotifications}>
          {props.userSettings &&
          props.threadId &&
          props.userSettings.notifications?.threads?.includes(
            props.threadId
          ) ? (
            <FontAwesomeIcon className="text-ok" icon={faCheckSquare} />
          ) : (
            <FontAwesomeIcon className="text-ok" icon={faSquare} />
          )}
        </button>
        <div>Send me an email on any new post in this thread.</div>
      </div>
      {paginationBox}
      {!posts && "loading"}
      {postList &&
        postList.map((post) => (
          <Post
            key={post.id}
            postId={post.id}
            post={post}
            threadId={props.threadId!}
            forumId={props.forumId!}
            user={props.user}
            isDisabled={postBeingEdited !== null && postBeingEdited !== post.id}
            isOnlyPost={thread.postCount === 1}
            toggleEditPost={handleToggleEditPost}
            setDialog={props.setDialog}
            handleQuote={handleQuote}
            scrollToMe={pageString === "last" && post.index === end - 1}
            deleteThread={deleteThread}
          />
        ))}
      {paginationBox}
      <form
        className="container mt-4 border-t-2 border-main"
        ref={newPostRef}
        onSubmit={handleSubmitPost}
      >
        <div className="flex flex-col my-1">
          <h1>
            <label htmlFor="postContent">Add a post</label>
          </h1>
          <textarea
            ref={contentRef}
            id="postContent"
            className="border border-neutral p-2 rounded h-64"
            placeholder="Type new post here"
          />
        </div>
        <div className="my-2">
          <button className="btn btn-ok">Submit Post</button>
        </div>
      </form>
    </div>
  );
}

export default PostList;
