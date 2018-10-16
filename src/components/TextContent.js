import React from 'react';
import Linkify from 'linkifyjs/react';

const TextContent = ({ content }) => {
	const rawTokens = content.split(/(\[\/?(?:spoiler|img|b|i)\])/);
	const tokens = [];
	for (let i = 0; i < rawTokens.length; i++) {
		if (!rawTokens[i]) {
			continue;
		}
		switch(rawTokens[i]) {
			case '[img]':
				const url = encodeURI(rawTokens[i + 1]);
				tokens.push({ type: 'image', key: i, src: url });
				i += 2;
				break;
			case '[b]':
				tokens.push({ type: 'bold', key: i, text: rawTokens[i + 1] });
				i += 2;
				break;
			case '[i]':
				tokens.push({ type: 'italic', key: i, text: rawTokens[i + 1] });
				i += 2;
				break;
			case '[spoiler]':
				tokens.push({ type: 'spoiler', key: i, text: rawTokens[i + 1] });
				i += 2;
				break;
			default:
				tokens.push({ type: 'normal', key: i, text: rawTokens[i] });
		}
	}
	const contentEls = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		let lines = [];
		switch(token.type) {
			case 'image':
				contentEls.push(<img alt="user inserted" key={`${i}`} src={token.src} />);
				break;
			case 'bold':
			case 'italic':
			case 'normal':
			case 'spoiler':
				if (token.text.includes('\n')) {
					lines = token.text.split('\n');
				} else {
					lines = [token.text];
				}
				lines.forEach((line, lineIndex) => {
					const options = {
						className: 'user-link'
					};
					const linkifiedLine = (
						<Linkify
							key={`${i}-${lineIndex}`}
							className={token.type}
							tagName="span" options={options}
						>
							{line}
						</Linkify>
						);
					contentEls.push(linkifiedLine);
					if (lineIndex !== lines.length - 1) {
						contentEls.push(<span key={`space-${i}-${lineIndex}`} className="space" />);
					}
				});
				break;
			default:
				// just in case - shouldn't hit this
				contentEls.push(<span key={i}>{token.text}</span>);
		}
	}
	return contentEls;
}

export default TextContent;