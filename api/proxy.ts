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
      // Parse the URL - the rewrite sends requests here, but we need the original path
      const url = new URL(request.url);

      // Try multiple ways to get the original path:
      // 1. From query parameter (if rewrite passes it)
      let path = url.searchParams.get('path') || '';

      // 2. From Vercel headers (if available)
      if (!path) {
        const originalUrl = request.headers.get('x-vercel-original-url') ||
          request.headers.get('x-invoke-path') ||
          request.headers.get('x-rewrite-path');
        if (originalUrl) {
          try {
            const originalPathname = new URL(originalUrl).pathname;
            path = originalPathname.replace(/^\/api\//, '');
          } catch {
            // If it's not a full URL, treat it as a path
            path = originalUrl.replace(/^\/api\//, '');
          }
        }
      }

      // 3. If we're at /api/proxy, the rewrite should have passed the path
      // But if not, we can't determine it - return error with debug info
      if (!path) {
        // Return debug info to help troubleshoot
        const debugInfo = {
          pathname: url.pathname,
          search: url.search,
          queryParams: Object.fromEntries(url.searchParams.entries()),
          headers: Object.fromEntries(request.headers.entries()),
          url: request.url,
        };

        return new Response(
          JSON.stringify({
            error: 'Could not determine API path from request',
            debug: debugInfo,
            hint: 'The rewrite should pass the path. Check vercel.json configuration.',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Build the full URL to Companies House API
      // Ensure path doesn't have leading/trailing slashes
      const cleanPath = path.replace(/^\/+|\/+$/g, '');
      const targetUrl = `${API_BASE_URL}/${cleanPath}`;

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
