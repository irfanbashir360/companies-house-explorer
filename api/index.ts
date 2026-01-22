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
      
      // Get the path from query parameter (passed by rewrite)
      let path = url.searchParams.get('path') || '';
      
      // If path is not in query params, try to extract from pathname
      // This handles cases where the rewrite might not work as expected
      if (!path) {
        const pathname = url.pathname;
        // If we're at /api/index, try to get original URL from headers
        if (pathname === '/api/index' || pathname === '/api') {
          // Try Vercel headers
          const originalUrl = request.headers.get('x-vercel-original-url') || 
                             request.headers.get('x-invoke-path');
          if (originalUrl) {
            try {
              const originalPathname = new URL(originalUrl).pathname;
              path = originalPathname.replace(/^\/api\//, '');
            } catch {
              path = originalUrl.replace(/^\/api\//, '');
            }
          }
        } else {
          // Direct path extraction
          path = pathname.replace(/^\/api\//, '').replace(/^\/api$/, '');
        }
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
