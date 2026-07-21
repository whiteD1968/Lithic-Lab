import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const hostingSource = join('.openai', 'hosting.json');
const hostingTarget = join('dist', '.openai', 'hosting.json');
const serverTarget = join('dist', 'server', 'index.js');

await mkdir(dirname(hostingTarget), { recursive: true });
await copyFile(hostingSource, hostingTarget);

await mkdir(dirname(serverTarget), { recursive: true });
await writeFile(
  serverTarget,
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') {
      return response;
    }

    const url = new URL(request.url);
    if (url.pathname.includes('.')) {
      return response;
    }

    return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
  }
};
`,
);
