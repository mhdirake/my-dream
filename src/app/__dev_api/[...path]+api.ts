const PROXY_PATH = '/__dev_api';

async function proxy(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }

  const incomingUrl = new URL(request.url);
  const apiPath = incomingUrl.pathname.slice(PROXY_PATH.length);
  if (!apiPath.startsWith('/api/')) {
    return new Response(null, { status: 404 });
  }

  const upstreamUrl = `${process.env.EXPO_PUBLIC_API_URL}${apiPath}${incomingUrl.search}`;
  const headers = new Headers();
  for (const name of ['accept', 'accept-language', 'authorization', 'content-type']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
      redirect: 'manual',
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of [
      'connection', 'transfer-encoding', 'content-encoding', 'content-length',
      'set-cookie', 'access-control-allow-origin', 'access-control-allow-credentials',
    ]) {
      responseHeaders.delete(name);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ message: 'Development API proxy failed' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
