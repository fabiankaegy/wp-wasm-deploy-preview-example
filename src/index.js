import { getInput, setFailed, startGroup, endGroup, debug } from '@actions/core';
import { context, getOctokit } from '@actions/github';

/**
 * @typedef {ReturnType<typeof import("@actions/github").getOctokit>} Octokit
 * @typedef {typeof import("@actions/github").context} ActionContext
 * @param {Octokit} octokit
 * @param {ActionContext} context
 * @param {string} token
 */
async function run(octokit, context) {
	const { number: pull_number } = context.issue;

	try {
		debug('pr' + JSON.stringify(context.payload, null, 2));
	} catch (e) { }

	let baseSha, baseRef;
	if (context.eventName == 'push') {
		baseSha = context.payload.before;
		baseRef = context.payload.ref;

		console.log(`Pushed new commit on top of ${baseRef} (${baseSha})`);
	} else if (context.eventName == 'pull_request' || context.eventName == 'pull_request_target') {
		const pr = context.payload.pull_request;
		baseSha = pr.base.sha;
		baseRef = pr.base.ref;

		console.log(`PR #${pull_number} is targeted at ${baseRef} (${baseRef})`);
	} else {
		throw new Error(
			`Unsupported eventName in github.context: ${context.eventName}. Only "pull_request", "pull_request_target", and "push" triggered workflows are currently supported.`
		);
	}

	const deploymentUrl = getInput('deploy-url');
	const currentTimestamp = new Date().toISOString();

	const markdownTable = `
**The latest updates on your projects.**

| Preview | Updated |
| --- | --- |
| [${deploymentUrl}](${deploymentUrl}) | ${currentTimestamp} |
	`;

	const commentInfo = {
		...context.repo,
		issue_number: pull_number
	};

	const comment = {
		...commentInfo,
		body:
			markdownTable +
			'\n\n<a href="https://github.com/fabiankaegy/wp-instant-preview-action"><sub>wp-instant-preview-action</sub></a>'
	};

	startGroup(`Updating stats PR comment`);
	let commentId;
	try {
		const comments = (await octokit.rest.issues.listComments(commentInfo)).data;
		for (let i = comments.length; i--;) {
			const c = comments[i];
			if (c.user.type === 'Bot' && /<sub>[\s\n]*(wp-instant-preview-action)/.test(c.body)) {
				commentId = c.id;
				break;
			}
		}
	} catch (e) {
		console.log('Error checking for previous comments: ' + e.message);
	}

	if (commentId) {
		console.log(`Updating previous comment #${commentId}`);
		try {
			await octokit.rest.issues.updateComment({
				...context.repo,
				comment_id: commentId,
				body: comment.body
			});
		} catch (e) {
			console.log('Error editing previous comment: ' + e.message);
			commentId = null;
		}
	}

	// no previous or edit failed
	if (!commentId) {
		console.log('Creating new comment');
		try {
			await octokit.rest.issues.createComment(comment);
		} catch (e) {
			console.log(`Error creating comment: ${e.message}`);
			console.log(`Submitting a PR review comment instead...`);
			try {
				const issue = context.issue;
				await octokit.rest.pulls.createReview({
					owner: issue.owner,
					repo: issue.repo,
					pull_number: issue.number,
					event: 'COMMENT',
					body: comment.body
				});
			} catch (e) {
				console.log('Error creating PR review.');
			}
		}

		console.log('All done!');
	}
	endGroup();

}

(async () => {
	try {
		const token = getInput('repo-token');
		const octokit = getOctokit(token);
		await run(octokit, context, token);
	} catch (e) {
		setFailed(e.message);
	}
})();