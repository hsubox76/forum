import React, { useEffect, useRef, useState } from 'react';
import '../styles/Posts.css';
import Post from './Post.js';
import { Link, navigate } from '@reach/router';
import { LOADING_STATUS, POSTS_PER_PAGE } from '../utils/constants';
import without from 'lodash/without';
import range from 'lodash/range';
import get from 'lodash/get';
import { deleteDoc, addPost, updateThread, getClaims } from '../utils/dbhelpers';
import { getParams, getPostRange } from '../utils/utils';
import { useSubscribeToDocument } from '../utils/hooks';

function PostList(props) {
  const contentRef = useRef();
  const newPostRef = useRef();
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [postBeingEdited, setPostBeingEdited] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const thread = useSubscribeToDocument('threads', props.threadId);
  if (thread && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }

  const forum = useSubscribeToDocument('forums', props.forumId);

  useEffect(() => {
    getClaims().then(claims => setIsAdmin(claims.admin));
  }, [props.user]);
  
  function deletePostFromThread (postId) {
    const postIds = thread.postIds;
    const updates = {
        postIds: without(postIds, postId)
    };
    //TODO: update last read time
    return updateThread(props.threadId, updates, props.forumId);
  }
  
  function handleDeleteThread () {
    props.setDialog({
      message: 'Sure you want to delete thread: ' + thread.title + '?',
      okText: 'delete',
      okClass: 'delete',
      onOk: deleteThread
    });
  }
  
  function handleQuote ({ content, uid }) {
    contentRef.current.value =
      `[quote uid=${uid}]${content}[/quote]\n` + contentRef.current.value;
    newPostRef.current.scrollIntoView({ behavior: "smooth" });
  }
  
  function handleSubmitPost (e) {
    e.preventDefault();
    addPost(contentRef.current.value, forum, thread, props.user)
      .then(() => {
        contentRef.current.value = '';
        navigate(`/forum/${props.forumId}` +
              `/thread/${props.threadId}` +
              `?page=last&posts=${POSTS_PER_PAGE}`);
        newPostRef.current.scrollIntoView({ behavior: "smooth" });
      });
  }
  
  function handleToggleEditPost (postId) {
    if (!postBeingEdited) {
      setPostBeingEdited(postId);
    } else {
      setPostBeingEdited(null);
    }
  }
  
  function handleUpdateLastRead (postId, timestamp) {
    updateThread(
      props.threadId,
      { ['readBy.' + props.user.uid]: timestamp },
      props.forumId,
      { ['readBy.' + props.user.uid]: Date.now() });
  }
  
  function deleteThread () {
    setStatus(LOADING_STATUS.DELETING);
    const deletePromises = [];
    thread.postIds.forEach(postId => {
      deletePromises.push(deleteDoc('posts', postId));
    });
    deletePromises.push(deleteDoc('threads', props.threadId));
    // TODO: Update forum based on latest updated thread remaining.
    Promise.all(deletePromises)
      .then(() => {
        setStatus(LOADING_STATUS.DELETED);
        this.setState({ thread: null, status: LOADING_STATUS.DELETED });
      })
      .catch(e => setStatus(LOADING_STATUS.PERMISSIONS_ERROR));
  }
  
  if (status === LOADING_STATUS.DELETING) {
    return (
      <div className="page-message-container">
        <div>deleting</div>
        <div className="loader loader-med"></div>
      </div>
    );
  }
  if (status === LOADING_STATUS.LOADING) {
    return (
      <div className="page-message-container">
        <div className="loader loader-med"></div>
      </div>
    );
  }
  if (status === LOADING_STATUS.PERMISSIONS_ERROR) {
    return (
      <div className="page-message-container">
        <div>Sorry, you don't have permission to do that.</div>
        <div><span onClick={() => this.setState({ status: LOADING_STATUS.LOADED })}>Back to thread.</span></div>
      </div>
    );
  }
  if (status === LOADING_STATUS.DELETED || !thread) {
    return (
      <div className="page-message-container">
        <div>This thread has been deleted.</div>
        <div><Link to="/">Back to top.</Link></div>
      </div>
    );
  }
  
  let { posts = POSTS_PER_PAGE, page: pageString = 0 } = getParams(props.location.search);
  const { start, end, numPages, page } = getPostRange(pageString, posts, thread.postIds);
  
  const postList = thread.postIds &&
    thread.postIds
      .slice(start, end)
      .map((postId, index) => ({ id: postId, index: index + start }));
      
  const paginationBox = (
    <div className="pagination-control">
      page
      {range(numPages)
        .map(pageNum => {
          const pageLink = `/forum/${props.forumId}` +
            `/thread/${props.threadId}` +
            `?page=${pageNum}&posts=${posts}`;
          const classes = ['page-link'];
          if (pageNum === page) {
            classes.push('selected');
          }
          return (
            <Link key={'page-' + pageNum} className={classes.join(' ')} to={pageLink}>
            {pageNum}</Link>
          );
          
        })}
    </div>
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
          <span className="thread-title">{thread.title}</span>
        </div>
        <div>
          {isAdmin &&
            <button className="button-delete" onClick={handleDeleteThread}>
              delete
            </button>
          }
        </div>
      </div>
      {paginationBox}
      {!thread.postIds && "loading"}
      {postList && postList.map(({ id, index }, listIndex) => (
        <Post
          key={id}
          postId={id}
          user={props.user}
          index={index}
          isDisabled={postBeingEdited && postBeingEdited !== id}
          isOnlyPost={thread.postIds.length === 1}
          deleteThread={handleDeleteThread}
          deletePostFromThread={deletePostFromThread}
          toggleEditPost={handleToggleEditPost}
          threadId={props.threadId}
          usersByUid={props.usersByUid}
          addUserByUid={props.addUserByUid}
          setDialog={props.setDialog}
          handleQuote={handleQuote}
          isLastOnPage={index === end - 1}
          lastReadTime={get(thread, ['readBy', props.user.uid]) || 0}
          updateLastRead={handleUpdateLastRead}
        />
      ))}
      {paginationBox}
      <form className="new-post-container" ref={newPostRef} onSubmit={handleSubmitPost}>
        <div className="form-line">
          <label>Add a post</label>
          <textarea ref={contentRef} className="content-input" placeholder="Type new post here" />
        </div>
        <div className="form-line">
          <button>Submit Post</button>
        </div>
      </form>
    </div>
  );
}

export default PostList;
