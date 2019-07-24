import React, { useEffect, useRef, useState, useContext } from "react";
import "../styles/Posts.css";
import Post from "./Post.js";
import { Link, navigate } from "@reach/router";
import { LOADING_STATUS, POSTS_PER_PAGE } from "../utils/constants";
import range from "lodash/range";
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
  addDoc
} from "../utils/dbhelpers";
import { getParams, getPostRange } from "../utils/utils";
import {
  useSubscribeToDocumentPath,
  useSubscribeToCollection
} from "../utils/hooks";
import UserContext from "./UserContext";

let loopCount = 0;

function PostList(props) {
  const contentRef = useRef();
  const newPostRef = useRef();
  const titleRef = useRef();
  const context = useContext(UserContext);
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [postBeingEdited, setPostBeingEdited] = useState(null);
  const [claims, setClaims] = useState({});
  const [userMap, setUserMap] = useState({});
  const [threadTitleEditing, setThreadTitleEditing] = useState(false);

  const forum = useSubscribeToDocumentPath(`forums/${props.forumId}`);
  const thread = useSubscribeToDocumentPath(
    `forums/${props.forumId}/threads/${props.threadId}`
  );

  let posts = useSubscribeToCollection(
    `forums/${props.forumId}/threads/${props.threadId}/posts`,
    [{ orderBy: "createdTime" }]
  );

  if (thread && posts && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }

  useEffect(
    () => {
      getClaims().then(claims => setClaims(claims));
    },
    [props.user]
  );

  useEffect(
    () => {
      let unmounting = false;
      if (posts && loopCount < 20) {
        let uids = posts.map(post => {
          let uids = [post.uid, post.updatedBy];
          if (post.reactions) {
            const reactionIds = Object.values(post.reactions);
            uids = uids.concat(flatten(reactionIds));
          }
          return uids;
        });
        uids = uniq(flatten(uids))
          .filter(uid => uid)
          .sort();
        getUsers(uids, context).then(users => !unmounting && setUserMap(users));
        loopCount++;
      }
      return () => { unmounting = true };
    },
    [posts, context]
  );

  function handleDeleteThread() {
    props.setPopup({
      type: "dialog",
      message: "Sure you want to delete thread: " + thread.title + "?",
      okText: "delete",
      okClass: "delete",
      onOk: deleteThread
    });
  }

  function handleMergeThread() {
    props.setPopup({
      type: "merge",
      forumId: props.forumId,
      threadId: props.threadId,
      onOk: mergeThread
    });
  }

  function toggleEditThread() {
    setThreadTitleEditing(!threadTitleEditing);
  }

  function handleQuote({ content, uid }) {
    contentRef.current.value =
      `[quote uid=${uid}]${content}[/quote]\n` + contentRef.current.value;
    newPostRef.current.scrollIntoView({ behavior: "smooth" });
  }

  function handleSubmitPost(e) {
    e.preventDefault();
    addPost(contentRef.current.value, forum, thread, props.user).then(() => {
      contentRef.current.value = "";
      navigate(
        `/forum/${props.forumId}` +
          `/thread/${props.threadId}` +
          `?page=last&posts=${POSTS_PER_PAGE}`
      );
      newPostRef.current.scrollIntoView({ behavior: "smooth" });
    });
  }

  function handleSubmitTitle() {
    if (titleRef.current.value === thread.title) return;
    updateDoc(`forums/${props.forumId}/threads/${props.threadId}`, {
      title: titleRef.current.value
    })
      .then(() => setThreadTitleEditing(false))
      .catch(e => console.error(e));
  }

  function handleToggleEditPost(postId) {
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
      .catch(e => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
  }

  function mergeThread(threadToMerge) {
    // setStatus(LOADING_STATUS.LOADING);
    getCollection(`forums/${props.forumId}/threads/${threadToMerge}/posts`)
      .then(listSnap => {
        let newPosts = [];
        let mergedPosts = [];
        listSnap.forEach(postSnap => newPosts.push(Object.assign(postSnap.data(), { id: postSnap.id })));
        mergedPosts = newPosts
          .concat(posts.map(post => Object.assign(post)))
          .sort((a, b) => {
            if (a.createdTime < b.createdTime) {
              return -1;
            } else if (a.createdTime > b.createdTime) {
              return 1;
            }
            return 0;
          });
        // add second thread's posts to this thread 
        const postAddPromises = newPosts.map(post => {
          if (!post.updatedByUser) {
            post.updatedByUser = post.uid;
          }
          return addDoc(`forums/${props.forumId}/threads/${props.threadId}/posts`, post);
        });
        return Promise.all(postAddPromises).then(() => ({
          postCount: posts.length + newPosts.length,
          createdTime: mergedPosts[0].createdTime,
          createdBy: mergedPosts[0].uid
        }))
      })
      // update thread's post count
      .then((postUpdates) => {
        updateDoc(`forums/${props.forumId}/threads/${props.threadId}`, postUpdates);
      })
      .then(() => {
        // delete second thread
        const deletePromises = [];
        deletePromises.push(
          deleteCollection(
            `forums/${props.forumId}/threads/${threadToMerge}/posts`
          )
        );
        deletePromises.push(
          deleteDoc(`forums/${props.forumId}/threads/${threadToMerge}`)
        );
        return Promise.all(deletePromises);
      })
      .then(() => {
        setStatus(LOADING_STATUS.LOADED);
      })
      .catch(e => {
        console.error(e);
        setStatus(LOADING_STATUS.LOADED);
      });
  }

  if (status === LOADING_STATUS.DELETING) {
    return (
      <div className="page-message-container">
        <div>deleting</div>
        <div className="loader loader-med" />
      </div>
    );
  }
  if (status === LOADING_STATUS.LOADING) {
    return (
      <div className="page-message-container">
        <div className="loader loader-med" />
      </div>
    );
  }
  if (status === LOADING_STATUS.PERMISSIONS_ERROR) {
    return (
      <div className="page-message-container">
        <div>Sorry, you don't have permission to do that.</div>
        <div>
          <span
            onClick={() => this.setState({ status: LOADING_STATUS.LOADED })}
          >
            Back to thread.
          </span>
        </div>
      </div>
    );
  }
  if (status === LOADING_STATUS.DELETED || !thread) {
    return (
      <div className="page-message-container">
        <div>This thread has been deleted.</div>
        <div>
          <Link to="/">Back to top.</Link>
        </div>
      </div>
    );
  }

  const params = getParams(props.location.search);
  const postsPerPage = params.posts || POSTS_PER_PAGE;
  const pageString = params.page || 0;
  const { start, end, numPages, page } = getPostRange(
    pageString,
    postsPerPage,
    posts.length
  );
  const postList = posts
    ? posts.slice(start, end).map((post, index) =>
        Object.assign(post, {
          index: index + start,
          createdByUser: userMap[post.uid],
          updatedByUser: post.updatedBy ? userMap[post.updatedBy] : userMap[post.uid]
        })
      )
    : [];
  //TODO: should be able to pass postdata straight to post and not have to reload it

  const paginationBox = (
    <div className="pagination-control">
      page
      {range(numPages).map(pageNum => {
        const pageLink =
          `/forum/${props.forumId}` +
          `/thread/${props.threadId}` +
          `?page=${pageNum}&posts=${postsPerPage}`;
        const classes = ["page-link"];
        if (pageNum === page) {
          classes.push("selected");
        }
        return (
          <Link
            key={"page-" + pageNum}
            className={classes.join(" ")}
            to={pageLink}
          >
            {pageNum}
          </Link>
        );
      })}
    </div>
  );

  const threadTitle = threadTitleEditing ? (
    <div className="thread-title">
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
    <div className="post-list-container">
      <div className="section-header">
        <div className="breadcrumbs">
          <span>
            <Link className="thread-label" to="/">
              Home
            </Link>
            <span className="title-caret">&gt;</span>
          </span>
          <span>
            <Link className="thread-label" to={`/forum/${props.forumId}`}>
              {forum && forum.name}
            </Link>
            <span className="title-caret">&gt;</span>
          </span>
          {threadTitle}
        </div>
        {(claims.admin || claims.mod) && !threadTitleEditing && (
          <div className="thread-buttons">
            <button className="button-merge" onClick={handleMergeThread}>
              merge
            </button>
            <button className="button-edit" onClick={toggleEditThread}>
              edit
            </button>
            <button className="button-delete" onClick={handleDeleteThread}>
              delete
            </button>
          </div>
        )}
      </div>
      {paginationBox}
      {!posts && "loading"}
      {postList &&
        postList.map(post => (
          <Post
            key={post.id}
            postId={post.id}
            post={post}
            threadId={props.threadId}
            forumId={props.forumId}
            user={props.user}
            index={post.index}
            isDisabled={postBeingEdited && postBeingEdited !== post.id}
            isOnlyPost={thread.postCount === 1}
            toggleEditPost={handleToggleEditPost}
            setDialog={props.setDialog}
            handleQuote={handleQuote}
            scrollToMe={pageString === "last" && post.index === end - 1}
          />
        ))}
      {paginationBox}
      <form
        className="new-post-container"
        ref={newPostRef}
        onSubmit={handleSubmitPost}
      >
        <div className="form-line">
          <label>Add a post</label>
          <textarea
            ref={contentRef}
            className="content-input"
            placeholder="Type new post here"
          />
        </div>
        <div className="form-line">
          <button>Submit Post</button>
        </div>
      </form>
    </div>
  );
}

export default PostList;
