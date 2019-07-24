import React, { useState, useEffect, useContext } from "react";
import "../styles/Posts.css";
import { format } from "date-fns";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import { COMPACT_DATE_FORMAT, STANDARD_DATE_FORMAT } from "../utils/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSubscribeToCollection } from "../utils/hooks";
import { getClaims, getUsers } from "../utils/dbhelpers";
import UserData from "./UserData";
import UserContext from "./UserContext";

function ForumList(props) {
  const [claims, setClaims] = useState(null);
  const [userMap, setUserMap] = useState({});
  const context = useContext(UserContext);

  useEffect(
    () => {
      getClaims().then(result => setClaims(result));
    },
    [props.user]
  );

  const forumList = useSubscribeToCollection("forums", [{ orderBy: "order" }]);

  useEffect(
    () => {
      let unmounting = false;
      if (forumList) {
        const uids = uniq(
          flatten(
            forumList.map(forum => [forum.createdBy, forum.updatedBy])
          ).filter(uid => uid)
        ).sort();
        getUsers(uids, context).then(users => !unmounting && setUserMap(users));
      }
      return () => { unmounting = true };
    },
    [forumList, context]
  );

  if (!forumList) {
    return (
      <div className="forum-list-container">
        <div className="loader loader-med" />
      </div>
    );
  }

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const dateFormat = isMobile ? COMPACT_DATE_FORMAT : STANDARD_DATE_FORMAT;

  function handleClickForum(e, forumId) {
    if (e.target.tagName !== "A") {
      props.navigate(`/forum/${forumId}`);
    }
  }

  return (
    <div className="forum-list-container">
      <div className="section-header">All Forums</div>
      {forumList
        .filter(
          forum =>
            forum &&
            (!forum.requiresClaims ||
              forum.requiresClaims.some(reqClaim => claims[reqClaim]))
        )
        .map(forum => {
          const classes = ["forum-row"];
          const isUnread =
            forum.unreadBy && forum.unreadBy.includes(props.user.uid);
          if (isUnread) {
            classes.push("unread");
          }
          return (
            <div
              onClick={e => handleClickForum(e, forum.id)}
              key={forum.id}
              className={classes.join(" ")}
            >
              <div className="forum-title">
                {isUnread && (
                  <FontAwesomeIcon
                    className="icon icon-comment"
                    icon="comment"
                  />
                )}
                <span className="title-text">{forum.name}</span>
              </div>
              <div className="forum-meta">
                <span>last updated by</span>
                <span className="info truncatable-name">
                  <UserData user={userMap[forum.updatedBy]} />
                </span>
                {!isMobile && <span>at</span>}
                <span className="info">
                  {format(forum.updatedTime, dateFormat)}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default ForumList;
