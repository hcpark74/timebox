export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response('Missing id', { status: 400 });
    }

    try {
        const statsKey = `user_${id}_stats`;
        const stats = await context.env.TIMEBOX_KV.get(statsKey, { type: 'json' });

        return new Response(JSON.stringify(stats || {}), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
