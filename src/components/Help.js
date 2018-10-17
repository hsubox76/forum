import React from 'react';
import '../styles/Help.css';

const Help = () => (
	<div className="help-page">
		<h1 className="title">Help</h1>
		<h2 className="header">Tags</h2>
		<div className="help-row">
			<div className="label bold">bold</div>
			<div className="text">[b]bold[/b]</div>
		</div>
		<div className="help-row">
			<div className="label italic">italic</div>
			<div className="text">[i]italic[/i]</div>
		</div>
		<div className="help-row">
			<div className="label spoiler">spoiler</div>
			<div className="text">[spoiler]spoiler[/spoiler]</div>
		</div>
	</div>
);

export default Help;