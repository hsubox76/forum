import React from 'react';
import Linkify from 'linkifyjs/react';
import escape from 'lodash/escape';
import startsWith from 'lodash/startsWith';
import trim from 'lodash/trim';

const TAG_TYPES = {
	'img': { className: 'image' },
	'url': { className: 'link' },
	'spoiler': { className: 'spoiler' },
	'b': { className: 'bold' },
	'i': { className: 'italic' },
	'quote': { className: 'quote' },
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
tagList.push('(?:quote [^\\]]+)');
const tagRE = tagList.join('|');

const tagsWithProperties = ['img', 'url', 'quote'];

function extractTag(tag) {
	for (let i = 0; i < tagsWithProperties.length; i++) {
		if (startsWith(tag, tagsWithProperties[i])) {
			return tagsWithProperties[i];
		}
	}
	return tag;
}

function getTagAttrs(tagString) {
	const tagParts = tagString.split(' ');
	const tagAttrs = {};
	tagParts.forEach(part => {
		if (part.includes('=')) {
			const pair = part.split('=');
			tagAttrs[trim(pair[0], '[]')] = trim(pair[1], '[]"');
		}
	});
	return tagAttrs;
}

const TextContent = ({ content }) => {
	const tokenDelimiterRE = new RegExp(`(\\[\\/?(?:${tagRE})\\])`);
	const tokens = content.split(tokenDelimiterRE);
	let contentEls = [];
	for (let i = 0; i < tokens.length; i++) {
		if (!tokens[i]) {
			continue;
		}
		const tagMatch = tokens[i].match(/\[([^\]]+)\]/);
		const tagType = extractTag(tagMatch ? tagMatch[1] : 'normal');
		const tagAttrs = getTagAttrs(tokens[i]);
		switch(tagType) {
			case 'img':
				const url = encodeURI(tokens[i + 1]);
				contentEls.push(<img alt="user inserted" key={i} src={url} width={tagAttrs.width || null} height={tagAttrs.height || null} />);
				break;
			case 'url':
				let href = '';
				if (tagAttrs.url) {
					href = escape(tagAttrs.url);
				} else {
					href = 'http://' + escape(tokens[i+1]);
				}
				contentEls.push(
					<a key={i} className="user-link" href={href} target="_blank">
						{tokens[i + 1]}
					</a>);
				break;
			case 'quote':
				let level = 1;
				const quoteRoot = { level, children: [], parent: null };
				let currentNode = quoteRoot;
				// lookahead for nested quote tags
				let j;
				for (j = i + 1; j < tokens.length; j++) {
					if (startsWith(tokens[j], '[quote')) {
						const newNode = { level: ++level, children: [], parent: currentNode  };
						currentNode.children.push(newNode);
						currentNode = newNode;
					} else if (tokens[j] === '[/quote]') {
						if (!currentNode.parent) {
							break;
						}
						currentNode = currentNode.parent;
						level--;
					} else {
						currentNode.children.push(tokens[j]);
					}
				}
				let k = 0;
				function renderNode(quoteNode) {
					return (
						<div key={++k + '-' + level} className="quote-box">
							{tagAttrs.name && <div>{tagAttrs.name} said:</div>}
							{quoteNode.children.map((child, childIndex) => {
									if (typeof child === 'string') {
										return <TextContent key={i + '-' + childIndex} content={child} />;
									} else {
										return renderNode(child);
									}
								})
							}
						</div>
					); 
				}
				contentEls.push(renderNode(quoteRoot));
				i = j + 2;
				break;
			case 'b':
			case 'i':
			case 'spoiler':
				contentEls = contentEls.concat(linkifyAndLineBreak(tokens[i + 1], i, TAG_TYPES[tagType]));
				break;
			case 'normal':
				contentEls = contentEls.concat(linkifyAndLineBreak(tokens[i], i, TAG_TYPES[tagType]));
				break;
			default:
				// just in case - shouldn't hit this
				contentEls.push(<span key={i}>{tokens[i]}</span>);
		}
		if (tagType !== 'normal' && tagType !== 'quote') {
			i += 2;
		}
	}
	return contentEls;
}

export default TextContent;