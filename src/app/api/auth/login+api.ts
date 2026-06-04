export async function POST(request: Request): Promise<Response> {
  try {
    const { username, password } = await request.json();

    const kcUrl = process.env.KC_URL ?? process.env.EXPO_PUBLIC_KC_URL;
    const kcSecret = process.env.KC_SECRET ?? process.env.EXPO_PUBLIC_KC_SECRET;

    if (!kcUrl || !kcSecret) {
      return new Response(
        JSON.stringify({ error: 'server_misconfigured', hint: 'KC_URL or KC_SECRET not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let tokenUrl: string;
    try {
      tokenUrl = new URL('/realms/My%20Dream/protocol/openid-connect/token', kcUrl).toString();
    } catch {
      return new Response(
        JSON.stringify({ error: 'invalid_kc_url', kcUrl }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = [
      ['grant_type', 'password'],
      ['client_id', 'backend-client'],
      ['client_secret', kcSecret],
      ['username', username],
      ['password', password],
    ]
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await res.json();

    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'internal_error', message: e?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
