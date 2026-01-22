const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default {
  async fetch(request: Request): Promise<Response> {
    const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const url = new URL(request.url);

      // Simple: get path from query param 'path' or extract from URL
      let path = url.searchParams.get('path') || '';

      // If no path param, try to get from the URL pathname itself
      // The request might be /api/search/companies directly
      if (!path) {
        const pathname = url.pathname;
        // Remove /api/ prefix
        if (pathname.startsWith('/api/')) {
          path = pathname.substring(5); // Remove '/api/'
        } else if (pathname === '/api') {
          path = '';
        }
      }

      // If still no path, return error with debug info
      if (!path) {
        return new Response(
          JSON.stringify({
            error: 'No API path specified',
            debug: { pathname: url.pathname, url: request.url, search: url.search }
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Build target URL
      const targetUrl = `${API_BASE_URL}/${path}`;
      const queryString = url.searchParams.toString().replace(/path=[^&]*&?/g, '').replace(/&$/, '');
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      // Proxy request
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: 'Internal server error', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
