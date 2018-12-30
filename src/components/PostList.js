import React, { useEffect, useRef, useState } from 'react';
import '../styles/Posts.css';
import Post from './Post.js';
import { Link, navigate } from '@reach/router';
import { LOADING_STATUS, POSTS_PER_PAGE } from '../utils/constants';
import range from 'lodash/range';
import {
  deleteDoc,
  deleteCollection,
  updateDoc,
  addPost,
  getClaims
} from '../utils/dbhelpers';
import { getParams, getPostRange } from '../utils/utils';
import { useSubscribeToDocumentPath, useSubscribeToCollection } from '../utils/hooks';

function PostList(props) {
  const contentRef = useRef();
  const newPostRef = useRef();
  const titleRef = useRef();
  const [status, setStatus] = useState(LOADING_STATUS.LOADING);
  const [postBeingEdited, setPostBeingEdited] = useState(null);
  const [claims, setClaims] = useState({});
  const [threadTitleEditing, setThreadTitleEditing] = useState(false);

  const forum = useSubscribeToDocumentPath(`forums/${props.forumId}`);
  const thread = useSubscribeToDocumentPath(`forums/${props.forumId}/threads/${props.threadId}`);

  let posts = useSubscribeToCollection(`forums/${props.forumId}/threads/${props.threadId}/posts`,
   [{ orderBy: 'createdTime' }]);

  if (thread && posts && status === LOADING_STATUS.LOADING) {
    setStatus(LOADING_STATUS.LOADED);
  }

  useEffect(() => {
    getClaims().then(claims => setClaims(claims));
  }, [props.user]);
  
  function handleDeleteThread () {
    props.setDialog({
      message: 'Sure you want to delete thread: ' + thread.title + '?',
      okText: 'delete',
      okClass: 'delete',
      onOk: deleteThread
    });
  }

  function toggleEditThread () {
    setThreadTitleEditing(!threadTitleEditing);
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

  function handleSubmitTitle() {
    if (titleRef.current.value === thread.title) return;
    updateDoc(`forums/${props.forumId}/threads/${props.threadId}`,
      { title: titleRef.current.value })
      .then(() => setThreadTitleEditing(false))
      .catch(e => console.log(e));
  }
  
  function handleToggleEditPost (postId) {
    if (!postBeingEdited) {
      setPostBeingEdited(postId);
    } else {
      setPostBeingEdited(null);
    }
  }
  
  function deleteThread () {
    setStatus(LOADING_STATUS.DELETING);
    const deletePromises = [];
    deletePromises.push(deleteCollection(`forums/${props.forumId}/threads/${props.threadId}/posts`));
    deletePromises.push(deleteDoc(`forums/${props.forumId}/threads/${props.threadId}`));
    // TODO: Update forum based on latest updated thread remaining.
    Promise.all(deletePromises)
      .then(() => {
        setStatus(LOADING_STATUS.DELETED);
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
  
  const params = getParams(props.location.search);
  const postsPerPage = params.posts || POSTS_PER_PAGE;
  const pageString = params.page || 0;
  const { start, end, numPages, page } = getPostRange(pageString, postsPerPage, posts.length);
  const postList = posts ?
    posts
      .slice(start, end)
      .map((post, index) => ({ id: post.id, index: index + start })) : [];
      //TODO: should be able to pass postdata straight to post and not have to reload it
      
  const paginationBox = (
    <div className="pagination-control">
      page
      {range(numPages)
        .map(pageNum => {
          const pageLink = `/forum/${props.forumId}` +
            `/thread/${props.threadId}` +
            `?page=${pageNum}&posts=${postsPerPage}`;
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

  const threadTitle = threadTitleEditing
    ? (<div className="thread-title">
        <input ref={titleRef} className="title-edit-input" defaultValue={thread.title} />
        <button className="button-edit" onClick={handleSubmitTitle}>
          ok
        </button>
        <button className="button-cancel" onClick={toggleEditThread}>
          cancel
        </button>
      </div>)
    : (<span className="thread-title">{thread.title}</span>);
  
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
      {postList && postList.map(({ id, index }, listIndex) => (
        <Post
          key={id}
          postId={id}
          threadId={props.threadId}
          forumId={props.forumId}
          user={props.user}
          index={index}
          isDisabled={postBeingEdited && postBeingEdited !== id}
          isOnlyPost={thread.postCount === 1}
          toggleEditPost={handleToggleEditPost}
          setDialog={props.setDialog}
          handleQuote={handleQuote}
          scrollToMe={pageString === 'last' && index === end - 1}
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
