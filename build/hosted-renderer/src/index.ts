/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { getAssetFromKV, Options, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

export interface Env {
	SCENELESS_KV: KVNamespace;
}

function parseUrl(url: URL): { version: string, path: string} {
	// /studiokit/renderer/v1.0.0/renderer
	const [, studiokit, renderer, version, ...parts] = url.pathname.split('/');
	const remaining = parts.join('/');

	return { path: remaining, version };
}

// Manipulates the request to the worker to use the path to the KV store.
const handlePrefix =  (request: Request) => {
	const defaultAssetKey = mapRequestToAsset(request);
	const url = new URL(defaultAssetKey.url);
	const { version, path } = parseUrl(url);
	
	url.pathname = `/version/${version}/${path}`;
	
	return new Request(url.toString(), defaultAssetKey);
};


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/') {
			return Response.redirect('https://api.stream');
		}

		const { version } = parseUrl(url);

		const options: Partial<Options> = {
			ASSET_NAMESPACE: env.SCENELESS_KV,
			mapRequestToAsset: handlePrefix,
			defaultDocument: `/version/${version}/index.html`
		};
		
		return getAssetFromKV({
			request,
			waitUntil(promise) {
				ctx.waitUntil(promise);
			},
		}, options)
		.catch(() => {
			return new Response('Not Found', {
				status: 404,
			});
		});
	},
};
