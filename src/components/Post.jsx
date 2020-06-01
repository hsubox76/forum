import React, { useState, useEffect, useRef, useContext } from "react";
import { format } from "date-fns";
import { Link } from "@reach/router";
import get from "lodash/get";
import findKey from "lodash/findKey";
import TextContent from "./TextContent";
import UserData from "./UserData";
import UserContext from "./UserContext";
import {
  LOADING_STATUS,
  STANDARD_DATE_FORMAT,
  reactions,
} from "../utils/constants";
import {
  deleteDoc,
  updatePost,
  getClaims,
  updateReadStatus,
  updatePostCount,
} from "../utils/dbhelpers";
import ReactionButton from "./ReactionButton";

function Post(props) {
  const [status, setStatus] = useState(null);
  const [claims, setClaims] = useState(false);
  const [scrolledOnce, setScrolledOnce] = useState(false);
  const context = useContext(UserContext);
  const postRef = useRef();
  const contentRef = useRef();

  const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${props.postId}`;

  const post = props.post;

  const postUser = post.createdByUser;

  // scroll to bottom if/when post updates and is last post
  useEffect(() => {
    if (props.scrollToMe && post && !scrolledOnce) {
      postRef.current && postRef.current.scrollIntoView();
      setScrolledOnce(true);
    }
  }, [post, props.scrollToMe, scrolledOnce]);

  useEffect(() => {
    getClaims().then(setClaims);
  }, [props.user]);

  useEffect(() => {
    return () =>
      updateReadStatus(
        true,
        props.user,
        props.postId,
        props.threadId,
        props.forumId
      );
  }, [props.user, props.postId, props.threadId, props.forumId]);

  function toggleEditMode() {
    if (status === LOADING_STATUS.EDITING) {
      setStatus(LOADING_STATUS.LOADED);
    } else {
      setStatus(LOADING_STATUS.EDITING);
    }
    props.toggleEditPost(props.postId);
  }

  function deletePost() {
    setStatus(LOADING_STATUS.DELETING);
    deleteDoc(postPath)
      .then(() => {
        return updatePostCount(props.forumId, props.threadId);
      })
      .then(() => {
        console.log(`Successfully deleted post ${props.postId}`);
      })
      .catch((e) => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
  }

  function handleDeletePost() {
    props.setDialog({
      message: "Sure you want to delete this post?",
      okText: "delete",
      okClass: "danger",
      onOk: deletePost,
    });
  }

  function handleEditPost() {
    setStatus(LOADING_STATUS.SUBMITTING);
    updatePost(contentRef.current.value, postPath, props.user).then(() => {
      //TODO: update thread "last updated" info
      setStatus(LOADING_STATUS.LOADED);
      props.toggleEditPost(props.postId);
    });
  }

  function renderAdminButtons() {
    const adminButtons = [];

    function addButton(name, buttonType, action, disabledCondition = false) {
      adminButtons.push(
        <button
          key={name}
          className={`btn btn-${buttonType}`}
          disabled={status === LOADING_STATUS.SUBMITTING || disabledCondition}
          onClick={action}
        >
          {name}
        </button>
      );
    }

    if (status !== LOADING_STATUS.EDITING) {
      addButton("quote", "neutral", () => props.handleQuote(post));
    }
    if (claims.admin || claims.mod || props.user.uid === post.uid) {
      if (status === LOADING_STATUS.EDITING) {
        addButton("cancel", "neutral", toggleEditMode);
        addButton("ok", "ok", handleEditPost);
      } else {
        addButton("edit", "ok", toggleEditMode, props.isDisabled);
        const deleteAction = props.isOnlyPost
          ? props.deleteThread
          : handleDeletePost;
        addButton("delete", "danger", deleteAction, props.isDisabled);
      }
    }
    return adminButtons;
  }

  // TODO: Permissions error - popup - unlikely case though.
  if (status === LOADING_STATUS.DELETED) {
    // this shouldn't happen... but just in case
    return (
      <div key={props.postId} className="post-container">
        This post has been deleted.
      </div>
    );
  }
  if (
    !post ||
    status === LOADING_STATUS.LOADING ||
    status === LOADING_STATUS.DELETING
  ) {
    return (
      <div key={props.postId} className="post-container">
        <div className="loader loader-med" />
      </div>
    );
  }
  let currentReaction = null;
  if (post.reactions) {
    currentReaction = findKey(post.reactions, (uids) =>
      uids.includes(props.user.uid)
    );
  }
  const footer = (
    <div className="flex justify-between">
      <div className="flex space-x-1">
        {reactions.map((reaction) => (
          <ReactionButton
            key={post.postId + "_" + reaction.faName}
            currentReaction={currentReaction}
            reaction={reaction}
            post={post}
            {...props}
          />
        ))}
      </div>
      <div className="space-x-2">{renderAdminButtons()}</div>
    </div>
  );
  const classes = ["px-2 py-1 border-main border rounded my-2"];
  if (status === LOADING_STATUS.EDITING) {
    classes.push("editing");
  }
  if (props.isDisabled) {
    classes.push("disabled");
  }
  if (post.unreadBy && post.unreadBy.includes(props.user.uid)) {
    classes.push("unread");
  }
  return (
    <div key={post.id} ref={postRef} className={classes.join(" ")}>
      <div className="flex justify-between items-center">
        <div className="flex items-baseline space-x-2">
          {postUser && postUser.photoURL && (
            <img
              className="w-16 h-16"
              alt="User's Avatar"
              src={postUser.photoURL}
            />
          )}
          {postUser ? (
            <Link className="font-medium text-ok" to={`/user/${postUser.id}`}>
              {postUser.displayName}
            </Link>
          ) : (
            <div className="loader loader-small" />
          )}
          {get(postUser, "admin") && <div className="role-icon">A</div>}
          {get(postUser, "mod") && <div className="role-icon">M</div>}
        </div>
        <div className="flex flex-col items-end self-stretch justify-between">
          <div>#{props.index}</div>
          <div className="text-sm">
            {format(post.createdTime, STANDARD_DATE_FORMAT)}
          </div>
        </div>
      </div>
      <div className="text-text my-3 overflow-x-auto">
        {status === LOADING_STATUS.EDITING ? (
          <form className="edit-post-container" onSubmit={handleEditPost}>
            <textarea
              ref={contentRef}
              className="content-input"
              defaultValue={post.content}
            />
          </form>
        ) : (
          <TextContent
            content={post.content}
            user={props.user}
            usersByUid={context.usersByUid}
            addUserByUid={context.addUserByUid}
          />
        )}
      </div>
      {post.updatedBy && (
        <div className="flex space-x-1 text-sm">
          <span>Last edited</span>
          <span className="text-ok font-medium">
            {format(post.updatedTime, STANDARD_DATE_FORMAT)}
          </span>
          <span>by</span>
          <span className="text-ok font-medium">
            <UserData user={post.updatedByUser} />
          </span>
        </div>
      )}
      {footer}
    </div>
  );
}

export default Post;
