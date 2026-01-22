const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default {
  async fetch(request: Request): Promise<Response> {
    const API_KEY = process.env.COMPANIES_HOUSE_API_KEY?.trim();

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Extract path after /api/officers/
      // e.g., /api/officers/12345/appointments -> 12345/appointments
      let path = pathname.replace(/^\/api\/officers\//, '').replace(/^\/api\/officers$/, '');
      path = path.replace(/\/+$/, '');

      if (!path) {
        return new Response(
          JSON.stringify({ error: 'Officer path not provided' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const targetUrl = `${API_BASE_URL}/officers/${path}`;
      const queryString = url.searchParams.toString();
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      const authHeader = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      let data;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text || 'Unknown error', status: response.status };
        }
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('API Proxy Error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
