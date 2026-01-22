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
      
      // Extract the path after /api/
      // e.g., /api/company/12345/officers -> company/12345/officers
      let path = pathname.replace(/^\/api\//, '').replace(/^\/api$/, '');
      path = path.replace(/\/+$/, ''); // Remove trailing slashes
      
      if (!path) {
        return new Response(
          JSON.stringify({ error: 'Invalid API path' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Build target URL
      const targetUrl = `${API_BASE_URL}/${path}`;
      const queryString = url.searchParams.toString();
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      // Create auth header
      const authHeader = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`;

      // Make request to Companies House API
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      // Handle response
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
