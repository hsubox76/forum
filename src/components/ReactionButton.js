import React, { useState } from 'react';
import { updateReaction } from '../utils/dbhelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import get from 'lodash/get';

const ReactionButton = (props) => {
	const [showTip, setShowTip] = useState(false);
	const post = props.post;
	const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${props.postId}`;
	
	function handleClick(userSelected) {
		updateReaction(props.user.uid, postPath, props.reaction.faName, !userSelected);
		if (props.currentReaction && !userSelected) {
			updateReaction(props.user.uid, postPath, props.currentReaction, false);
		}
		setShowTip(false);
	}
	const responses = get(post, ['reactions', props.reaction.faName]) || [];
	const classes = ['reaction-button'];
	const userSelected = props.currentReaction === props.reaction.faName;
	if (userSelected) {
		classes.push('user-selected');
	}
	if (responses.length) {
		classes.push('has-count');
	}
	const tooltip = <div className="reaction-tooltip">{props.reaction.desc}</div>
	return (
		<button
			className={classes.join(' ')}
			onClick={() => handleClick(userSelected)}
			onMouseEnter={() => setShowTip(true)}
			onMouseLeave={() => setShowTip(false)}
		>
			{showTip && tooltip}
			<FontAwesomeIcon className="icon icon-reaction" icon={props.reaction.faName} size="lg" />
			{responses.length > 0 && <span className="reaction-count">{responses.length}</span>}
		</button>
	);
};

export default ReactionButton;
