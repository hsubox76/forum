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
  reactions
} from "../utils/constants";
import {
  deleteDoc,
  updatePost,
  getClaims,
  updateReadStatus,
  updatePostCount
} from "../utils/dbhelpers";
import ReactionButton from "./ReactionButton";

function Post(props) {
  const [status, setStatus] = useState(null);
  const [claims, setClaims] = useState(false);
  const [scrolledOnce, setScrolledOnce] = useState(false);
  const context = useContext(UserContext);
  const postRef = useRef();
  const contentRef = useRef();

  const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${
    props.postId
  }`;

  const post = props.post;

  const postUser = post.createdByUser;

  // scroll to bottom if/when post updates and is last post
  useEffect(
    () => {
      if (props.scrollToMe && post && !scrolledOnce) {
        postRef.current && postRef.current.scrollIntoView();
        setScrolledOnce(true);
      }
    },
    [post, props.scrollToMe, scrolledOnce]
  );

  useEffect(
    () => {
      getClaims().then(setClaims);
    },
    [props.user]
  );

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
      .catch(e => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
  }

  function handleDeletePost() {
    props.setDialog({
      message: "Sure you want to delete this post?",
      okText: "delete",
      okClass: "delete",
      onOk: deletePost
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
          className={`small button-${buttonType}`}
          disabled={status === LOADING_STATUS.SUBMITTING || disabledCondition}
          onClick={action}
        >
          {name}
        </button>
      );
    }

    if (status !== LOADING_STATUS.EDITING) {
      addButton("quote", "edit", () => props.handleQuote(post));
    }
    if (claims.admin || claims.mod || props.user.uid === post.uid) {
      if (status === LOADING_STATUS.EDITING) {
        addButton("cancel", "cancel", toggleEditMode);
        addButton("ok", "edit", handleEditPost);
      } else {
        addButton("edit", "edit", toggleEditMode, props.isDisabled);
        const deleteAction = props.isOnlyPost
          ? props.deleteThread
          : handleDeletePost;
        addButton("delete", "delete", deleteAction, props.isDisabled);
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
    currentReaction = findKey(post.reactions, uids =>
      uids.includes(props.user.uid)
    );
  }
  const footer = (
    <div className="post-footer">
      <div className="reactions-container">
        {reactions.map(reaction => (
          <ReactionButton
            key={post.postId + '_' + reaction.faName}
            currentReaction={currentReaction}
            reaction={reaction}
            post={post}
            {...props}
          />
        ))}
      </div>
      <div>{renderAdminButtons()}</div>
    </div>
  );
  const classes = ["post-container"];
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
      <div className="post-header">
        <div className="post-user">
          {postUser && postUser.photoURL && (
            <img
              className="avatar-post"
              alt="User's Avatar"
              src={postUser.photoURL}
            />
          )}
          {postUser ? (
            <Link className="user-name-link" to={`/user/${postUser.uid}`}>
              {postUser.displayName}
            </Link>
          ) : (
            <div className="loader loader-small" />
          )}
          {get(postUser, "customClaims.admin") && (
            <div className="role-icon">A</div>
          )}
          {get(postUser, "customClaims.mod") && (
            <div className="role-icon">M</div>
          )}
        </div>
        <div className="post-header-right">
          <div>#{props.index}</div>
          <div className="post-date">
            {format(post.createdTime, STANDARD_DATE_FORMAT)}
          </div>
        </div>
      </div>
      <div className="post-content">
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
        <div className="post-edited">
          <span>Last edited</span>
          <span className="edit-data">
            {format(post.updatedTime, STANDARD_DATE_FORMAT)}
          </span>
          <span>by</span>
          <span className="edit-data">
            <UserData user={post.updatedByUser} />
          </span>
        </div>
      )}
      {footer}
    </div>
  );
}

export default Post;
