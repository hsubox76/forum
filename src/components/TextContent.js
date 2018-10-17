import React from 'react';
import Linkify from 'linkifyjs/react';
import escape from 'lodash/escape';

const TAG_TYPES = {
	'img': { className: 'image' },
	'url': { className: 'link' },
	'spoiler': { className: 'spoiler' },
	'b': { className: 'bold' },
	'i': { className: 'italic' },
	'normal': { className: 'normal' },
};

function linkifyAndLineBreak(text, tokenIndex, tagType) {
	let contentEls = [];
	let lines = [];
	if (text.includes('\n')) {
		lines = text.split('\n');
	} else {
		lines = [text];
	}
	lines.forEach((line, lineIndex) => {
		const options = {
			className: 'user-link'
		};
		const linkifiedLine = (
			<Linkify
				key={`${tokenIndex}-${lineIndex}`}
				className={tagType.className}
				tagName="span" options={options}
			>
				{line}
			</Linkify>
			);
		contentEls.push(linkifiedLine);
		if (lineIndex !== lines.length - 1) {
			contentEls.push(<span key={`space-${tokenIndex}-${lineIndex}`} className="space" />);
		}
	});
	return contentEls;
}

const tagList = Object.keys(TAG_TYPES);
tagList.push('(?:url=[^\\]]+)');
tagList.push('(?:img [^\\]]+)');
const tagRE = tagList.join('|');

const TextContent = ({ content }) => {
	const tokenDelimiterRE = new RegExp(`(\\[\\/?(?:${tagRE})\\])`);
	const tokens = content.split(tokenDelimiterRE);
	let contentEls = [];
	for (let i = 0; i < tokens.length; i++) {
		if (!tokens[i]) {
			continue;
		}
		const tagMatch = tokens[i].match(/\[([^\]]+)\]/);
		let tag = tagMatch ? tagMatch[1] : 'normal';
		if (tag.includes('url')) {
			tag = 'url';
		}
		if (tag.includes('img')) {
			tag = 'img';
		}
		let tagParts = [];
		switch(tag) {
			case 'img':
				const url = encodeURI(tokens[i + 1]);
				tagParts = tokens[i].split(' ');
				const attrs = tagParts.reduce((attrLookup, part) => {
					const pair = part.split('=');
					if (pair.length > 1) {
						attrLookup[pair[0]] = pair[1];
					}
					return attrLookup;
				}, {});
				contentEls.push(<img alt="user inserted" key={i} src={url} width={attrs.width || null} height={attrs.height || null} />);
				break;
			case 'url':
				tagParts = tokens[i].split('=');
				let href = '';
				if (tagParts && tagParts[1]) {
					href = tagParts[1].slice(0, -1);
					if (href[0] === "\"") {
						href = href.slice(1);
					}
					if (href[href.length - 1] === "\"") {
						href = href.slice(0, -1);
					}
					href = escape(href);
				} else {
					href = 'http://' + escape(tokens[i+1]);
				}
				contentEls.push(
					<a key={i} className="user-link" href={href} target="_blank">
						{tokens[i + 1]}
					</a>);
				break;
			case 'b':
			case 'i':
			case 'spoiler':
				contentEls = contentEls.concat(linkifyAndLineBreak(tokens[i + 1], i, TAG_TYPES[tag]));
				break;
			case 'normal':
				contentEls = contentEls.concat(linkifyAndLineBreak(tokens[i], i, TAG_TYPES[tag]));
				break;
			default:
				// just in case - shouldn't hit this
				contentEls.push(<span key={i}>{tokens[i]}</span>);
		}
		if (tag !== 'normal') {
			i += 2;
		}
	}
	return contentEls;
}

export default TextContent;