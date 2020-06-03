import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Link } from "@reach/router";
import get from "lodash/get";
import findKey from "lodash/findKey";
import TextContent from "./TextContent";
import UserData from "./UserData";
import { STANDARD_DATE_FORMAT, reactions, COMPACT_DATE_FORMAT } from "../utils/constants";
import {
  deleteDoc,
  updatePost,
  getClaims,
  updateReadStatus,
  updatePostCount,
} from "../utils/dbhelpers";
import ReactionButton from "./ReactionButton";
import {
  LOADING_STATUS,
  DialogData,
  Claims,
  PostDisplayData,
  ReactionType,
} from "../utils/types";
interface PostProps {
  forumId: string;
  threadId: string;
  postId: string;
  post: PostDisplayData;
  isDisabled: boolean;
  isOnlyPost: boolean;
  toggleEditPost: (postId: string) => void;
  setDialog: (data: DialogData) => void;
  handleQuote: (post: PostDisplayData) => void;
  deleteThread: () => void;
  scrollToMe: boolean;
  user: firebase.User;
}

function Post(props: PostProps) {
  const [status, setStatus] = useState<LOADING_STATUS | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);
  const [scrolledOnce, setScrolledOnce] = useState(false);
  const postRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${props.postId}`;

  const post = props.post;

  const postUser = post.createdByUser;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

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
      type: "dialog",
      message: "Sure you want to delete this post?",
      okText: "delete",
      okClass: "danger",
      onOk: deletePost,
    });
  }

  function handleEditPost() {
    setStatus(LOADING_STATUS.SUBMITTING);
    if (contentRef.current?.value) {
      updatePost(contentRef.current.value, postPath, props.user).then(() => {
        //TODO: update thread "last updated" info
        setStatus(LOADING_STATUS.LOADED);
        props.toggleEditPost(props.postId);
      });
    }
  }

  function renderAdminButtons() {
    const adminButtons: React.ReactNodeArray = [];

    function addButton(
      name: string,
      buttonType: string,
      action: () => void,
      disabledCondition = false
    ) {
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
    if (claims?.admin || claims?.mod || props.user.uid === post.uid) {
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
      <div
        key={props.postId}
        className="px-2 py-1 border-main border rounded my-2"
      >
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
      <div
        key={props.postId}
        className="px-2 py-1 border-main border rounded my-2"
      >
        <div className="loader loader-med" />
      </div>
    );
  }
  let currentReaction: string | undefined = undefined;
  if (post.reactions) {
    currentReaction = findKey(post.reactions, (uids) =>
      uids.includes(props.user.uid)
    );
  }
  const footer = (
    <div className="flex flex-col lg:flex-row lg:justify-between">
      <div className="flex space-x-1">
        {reactions.map((reaction) => (
          <ReactionButton
            key={props.postId + "_" + reaction.faName}
            currentReaction={currentReaction as ReactionType}
            reaction={reaction}
            {...props}
          />
        ))}
      </div>
      <div className="space-x-2 my-2 lg:my-0">{renderAdminButtons()}</div>
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
  const dateFormat = isMobile ? COMPACT_DATE_FORMAT : STANDARD_DATE_FORMAT;
  return (
    <div key={post.id} ref={postRef} className={classes.join(" ")}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col lg:flex-row lg:items-baseline lg:space-x-2">
          {postUser && postUser.photoURL && (
            <img
              className="w-16 h-16"
              alt="User's Avatar"
              src={postUser.photoURL}
            />
          )}
          {postUser ? (
            <Link className="flex font-medium text-ok" to={`/user/${postUser.id}`}>
              <span>{postUser.displayName}</span>
              {get(postUser, "admin") && <div className="role-icon ml-1">A</div>}
              {get(postUser, "mod") && <div className="role-icon ml-1">M</div>}
            </Link>
          ) : (
            <div className="loader loader-small" />
          )}
        </div>
        <div className="flex flex-col items-end lg:self-stretch lg:justify-between">
          <div>#{post.index}</div>
          <div className="text-xs lg:text-sm">
            {format(post.createdTime, dateFormat)}
          </div>
        </div>
      </div>
      <div className="text-text my-3 overflow-x-auto">
        {status === LOADING_STATUS.EDITING ? (
          <form className="w-full" onSubmit={handleEditPost}>
            <textarea
              ref={contentRef}
              className="w-full p-2 h-48"
              defaultValue={post.content}
            />
          </form>
        ) : (
          <TextContent content={post.content} />
        )}
      </div>
      {post.updatedTime && post.updatedTime > post.createdTime && (
        <div className="flex space-x-1 text-sm my-2">
          <span>Last edited</span>
          <span className="text-ok font-medium">
            {format(post.updatedTime, dateFormat)}
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
