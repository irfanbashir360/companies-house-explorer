const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default {
  async fetch(request: Request): Promise<Response> {
    // Get API key from environment variable
    const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

    if (!API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'API key not configured. Please set COMPANIES_HOUSE_API_KEY in Vercel environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Parse the URL
      const url = new URL(request.url);
      
      // Get the original path from Vercel headers (set during rewrite)
      // Vercel sets x-vercel-original-url with the original request URL
      let path = '';
      
      const originalUrl = request.headers.get('x-vercel-original-url') || 
                         request.headers.get('x-invoke-path') ||
                         request.headers.get('x-rewrite-url');
      
      if (originalUrl) {
        try {
          // If it's a full URL, parse it
          const originalUrlObj = new URL(originalUrl);
          path = originalUrlObj.pathname.replace(/^\/api\//, '');
        } catch {
          // If it's just a path, use it directly
          path = originalUrl.replace(/^\/api\//, '');
        }
      }
      
      // Fallback: try to get from query parameter (if rewrite passes it)
      if (!path) {
        path = url.searchParams.get('path') || '';
      }
      
      // Last resort: extract from current pathname if we're not at /api/index
      if (!path && url.pathname !== '/api/index' && url.pathname !== '/api') {
        path = url.pathname.replace(/^\/api\//, '').replace(/^\/api$/, '');
      }
      
      // Remove any trailing slashes
      path = path.replace(/\/+$/, '');
      
      if (!path) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API path',
            debug: {
              pathname: url.pathname,
              search: url.search,
              queryParams: Object.fromEntries(url.searchParams.entries()),
              url: request.url,
            }
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Build the full URL to Companies House API
      const targetUrl = `${API_BASE_URL}/${path}`;
      
      // Forward query parameters from the original request (except 'path' which is our routing param)
      const searchParams = new URLSearchParams();
      url.searchParams.forEach((value, key) => {
        if (key !== 'path') {
          searchParams.append(key, value);
        }
      });
      
      const queryString = searchParams.toString();
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      // Make the request to Companies House API
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      // Get response data - handle both JSON and text responses
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

      // Forward the status code and data
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      console.error('API Proxy Error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
