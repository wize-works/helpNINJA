export function withCORS(res: Response) {
    res.headers.set('Access-Control-Allow-Origin', '*'); // or a specific domain
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
}
