import React, { useContext } from 'react';
import Linkify from 'linkifyjs/react';
import escape from 'lodash/escape';
import startsWith from 'lodash/startsWith';
import trim from 'lodash/trim';
import { useGetUser } from '../utils/hooks';
import UserContext from './UserContext';

const TAG_TYPES = {
	'img': { className: 'image' },
	'url': { className: 'link' },
	'spoiler': { className: 'spoiler' },
	'b': { className: 'bold' },
	'i': { className: 'italic' },
	'quote': { className: 'quote' },
	'normal': { className: 'normal' },
};

function linkifyAndLineBreak(text, tokenIndex, classes, currentUrl) {
	let contentEls = [];
	let lines = [];
	if (text.includes('\n')) {
		lines = text.split('\n');
	} else {
		lines = [text];
	}
	lines.forEach((line, lineIndex) => {
		if (!line) {
			return;
		}
		if (currentUrl) {
			contentEls.push(<span key={`${tokenIndex}-${lineIndex}`}>{line}</span>);
		} else {
			const options = {
				className: 'user-link'
			};
			const linkifiedLine = (
				<Linkify
					key={`${tokenIndex}-${lineIndex}`}
					className={classes.join(' ')}
					tagName="span" options={options}
				>
					{line}
				</Linkify>
				);
			contentEls.push(linkifiedLine);
		}
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
		if (startsWith(tag, '/')) {
			return tag.slice(1);
		}
	}
	return tag;
}

function getTagAttrs(tagString) {
	const tagParts = trim(tagString, '[]').split(' ');
	const tagAttrs = {};
	tagParts.forEach(part => {
		if (part.includes('=')) {
			const pair = part.split(/=(.+)/, 2);
			tagAttrs[pair[0]] = trim(pair[1], '"');
		}
	});
	return tagAttrs;
}

const TextContent = (props) => {
	if (!props.content || typeof props.content !== 'string') {
		return null;
	}
	const context = useContext(UserContext);
	const tokenDelimiterRE = new RegExp(`(\\[\\/?(?:${tagRE})\\])`);
	const tokens = props.content.split(tokenDelimiterRE);
		
	const root = {
		level: 0,
		tagType: null,
		children: [],
		parent: null
	};
	let currentNode = root;
	const tagLevels = Object.keys(TAG_TYPES).reduce((obj, tagType) => {
		obj[tagType] = 0;
		return obj;
	}, {});
	
	const tagStates = {
		'b': false,
		'i': false,
		'spoiler': false,
		currentUrl: null
	};
	let currentUrl = null;
	
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!token) {
			continue;
		}
		const tagMatch = token.match(/\[([^\]]+)\]/);
		const tagType = extractTag(tagMatch ? tagMatch[1] : 'normal');
		const isBlockTag = tagType === 'img' || tagType === 'quote';
		const isTag = tagType !== 'normal';
		const isClose = isTag && token[1] === '/';
		const tagAttrs = getTagAttrs(token);
		
		if (isBlockTag) {
			if (!isClose) {
				const newNode = {
					tagType,
					level: ++tagLevels[tagType],
					children: [],
					parent: currentNode,
					...tagStates,
					tagAttrs
				};
				currentNode.children.push(newNode);
				currentNode = newNode;
			} else {
				if (!currentNode.parent) {
					break;
				}
				currentNode = currentNode.parent;
				tagLevels[tagType]--;
			}
		} else if (isTag) {
			if (isClose) {
				if (['b', 'i', 'spoiler'].includes(tagType)) {
					tagStates[tagType] = false;
				}
				if (tagType === 'url') {
					currentUrl = null;
				}
			} else {
				if (['b', 'i', 'spoiler'].includes(tagType)) {
					tagStates[tagType] = true;
				}
				if (tagType === 'url') {
					if (tagAttrs.url) {
						currentUrl = escape(tagAttrs.url);
					} else {
						currentUrl = 'http://' + escape(tokens[i+1]);
					}
				}
			}
		} else {
			currentNode.children.push({
				tagType: 'text',
				level: tagLevels[tagType],
				text: token,
				...tagStates,
				currentUrl
			});
		}
	}
	let k = 0;
	function renderNode (node) {
		const classes = [];
		let quoteAuthor = '';
		if (node.tagType === 'quote') {
			classes.push('quote-box');
			if (node.tagAttrs.name) {
				quoteAuthor = node.tagAttrs.name;
			}
			if (node.tagAttrs.uid) {
				const user = useGetUser(node.tagAttrs.uid, context);
				quoteAuthor = user ? user.displayName : '?';
			}
		} else if (node.tagType === 'bold') {
			classes.push('bold');
		} else if (node.tagType === 'italic') {
			classes.push('italic');
		} else if (node.tagType === 'img') {
			const url = encodeURI(node.children[0].text);
			return (
				<img
					alt="user inserted"
					key={'image-' + k++}
					src={url}
					width={node.tagAttrs.width || null}
					height={node.tagAttrs.height || null}
				/>);
		}
		return (
			<div key={node.level + '-' + k++} className={classes.join(' ')} >
				{node.tagType === 'quote' &&
					<div className="quote-info">{quoteAuthor} said:</div>
				}
				{node.children.map((child, childIndex) => {
						if (child.tagType === 'text') {
							if (!child.text) {
								return null;
							}
							const classes = [];
							let elementType = 'span';
							if (child.b) {
								classes.push('bold');
							}
							if (child.i) {
								classes.push('italic');
							}
							if (child.spoiler) {
								classes.push('spoiler');
							}
							const props = {
								key: node.level + '-' + k + '-' + childIndex,
								className: classes.join(' ')
							};
							if (child.currentUrl) {
								elementType = 'a';
								props.href = child.currentUrl;
							}
							return React.createElement(
								elementType,
								props,
								linkifyAndLineBreak(child.text, k, classes, child.currentUrl));
						} else {
							return renderNode(child);
						}
					})
				}
			</div>
		); 
	}
	return renderNode(root);
}

export default TextContent;