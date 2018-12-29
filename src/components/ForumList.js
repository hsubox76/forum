import React from 'react';
import '../styles/Posts.css';
import { format } from 'date-fns';
import { Link } from "@reach/router"
import { COMPACT_DATE_FORMAT, STANDARD_DATE_FORMAT } from '../utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSubscribeToCollection } from '../utils/hooks';
import UserData from './UserData';

function ForumList(props) {
	const forumList = useSubscribeToCollection('forums', [{ orderBy: 'order' }]);
	if (!forumList) {
		return (
			<div className="forum-list-container">
				<div className="loader loader-med"></div>
			</div>
		);
	}
	const isMobile = window.matchMedia("(max-width: 767px)").matches;
	const dateFormat = isMobile
		? COMPACT_DATE_FORMAT
		: STANDARD_DATE_FORMAT;
	return (
		<div className="forum-list-container">
			<div className="section-header">All Forums</div>
			{forumList.map((forum) => {
				if (!forum) {
					return (
						<div key={forum.id} className="forum-row">
							<div className="loader loader-med"></div>
						</div>
					);
				}
				const classes = ['forum-row'];
        const isUnread = forum.unreadBy && forum.unreadBy.includes(props.user.uid);
				if (isUnread) {
					classes.push('unread');
				}
				return (
					<Link to={"forum/" + forum.id} key={forum.id} className={classes.join(' ')}>
						<div className="forum-title">
								{isUnread
									&& <FontAwesomeIcon className="icon icon-comment" icon="comment" />}
							<span className="title-text">{forum.name}</span>
						</div>
						<div className="forum-meta">
							<span>last updated by</span>
							<span className="info truncatable-name">
								<UserData uid={forum.updatedBy} />
							</span>
							{!isMobile && <span>at</span>}
							<span className="info">{format(forum.updatedTime, dateFormat)}</span>
						</div>
					</Link>
				);
			})}
		</div>
	);
}

export default ForumList;
