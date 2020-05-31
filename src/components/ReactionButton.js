import React, { useContext } from "react";
import { updateReaction } from "../utils/dbhelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import UserContext from "./UserContext";
import get from "lodash/get";

const ReactionButton = props => {
  const context = useContext(UserContext);
  const post = props.post;
  const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${props.postId}`;

  function handleClick(userSelected) {
    updateReaction(
      props.user.uid,
      postPath,
      props.reaction.faName,
      !userSelected
    );
    if (props.currentReaction && !userSelected) {
      updateReaction(props.user.uid, postPath, props.currentReaction, false);
    }
  }
  const responses = get(post, ["reactions", props.reaction.faName]) || [];
  const classes = ["reaction-button relative rounded-full w-8 h-8 focus:outline-none"];
  const userSelected = props.currentReaction === props.reaction.faName;
  if (responses.length) {
    classes.push("w-12");
    if (!userSelected) {
      classes.push('bg-main');
    } else {
      classes.push('bg-ok');
    }
  } else {
    classes.push('bg-neutral');
  }
  const tooltip = (
    <div className="reaction-tooltip text-left">
      <div>{props.reaction.desc}</div>
      {responses && responses.length > 0 && (
        <div className="border-t border-light">
          {responses.map(response => {
            const user = get(context.usersByUid, response);
            if (user) {
              return (
                <div
                  key={props.postId + user.id + props.reaction.faName}
                  className="text-sm"
                >
                  {user.displayName}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
  return (
    <button
      className={classes.join(" ")}
      onClick={() => handleClick(userSelected)}
    >
      {tooltip}
      <FontAwesomeIcon
        className="text-white"
        icon={props.reaction.faName}
        size="lg"
      />
      {responses.length > 0 && (
        <span className="text-white ml-2">{responses.length}</span>
      )}
    </button>
  );
};

export default ReactionButton;
