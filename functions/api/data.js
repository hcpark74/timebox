export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const date = url.searchParams.get('date');

    if (!id || !date) {
        return new Response('Missing id or date', { status: 400 });
    }

    // Key format: user_{id}_{date}
    const key = `user_${id}_${date}`;

    try {
        const value = await context.env.TIMEBOX_KV.get(key);
        if (!value) {
            return new Response(JSON.stringify(null), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(value, { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

export async function onRequestPut(context) {
    try {
        const body = await context.request.json();
        const { id, date, data, level } = body;

        if (!id || !date || !data) {
            return new Response('Missing required fields', { status: 400 });
        }

        // 1. Save Daily Data
        const key = `user_${id}_${date}`;
        await context.env.TIMEBOX_KV.put(key, JSON.stringify(data));

        // 2. Update Stats (Heatmap)
        // Key format: user_{id}_stats (JSON object)
        // Note: KV read-modify-write is not atomic, but sufficient for single-user use case.
        const statsKey = `user_${id}_stats`;
        let stats = await context.env.TIMEBOX_KV.get(statsKey, { type: 'json' });
        if (!stats) stats = {};

        stats[date] = level || 1; // 0-4

        await context.env.TIMEBOX_KV.put(statsKey, JSON.stringify(stats));

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
