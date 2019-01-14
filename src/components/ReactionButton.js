import React, { useContext } from 'react';
import { updateReaction } from '../utils/dbhelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import UserContext from './UserContext';
import get from 'lodash/get';

const ReactionButton = (props) => {
  const context = useContext(UserContext);
	const post = props.post;
	const postPath = `forums/${props.forumId}/threads/${props.threadId}/posts/${props.postId}`;
	
	function handleClick(userSelected) {
		updateReaction(props.user.uid, postPath, props.reaction.faName, !userSelected);
		if (props.currentReaction && !userSelected) {
			updateReaction(props.user.uid, postPath, props.currentReaction, false);
		}
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
	const tooltip = (
		<div className="reaction-tooltip">
			<div className="reaction-desc">{props.reaction.desc}</div>
				{responses && (
					<div className="reaction-users">
						{
							responses.map(response => {
								const user = get(context.usersByUid, response);
								if (user) {
									return <div key={user.uid} className="reaction-user-name">{user.displayName}</div>
								}
								return null;
							})}
					</div>
				)}
		</div>
	);
	return (
		<button
			className={classes.join(' ')}
			onClick={() => handleClick(userSelected)}
		>
			{tooltip}
			<FontAwesomeIcon className="icon icon-reaction" icon={props.reaction.faName} size="lg" />
			{responses.length > 0 && <span className="reaction-count">{responses.length}</span>}
		</button>
	);
};

export default ReactionButton;
