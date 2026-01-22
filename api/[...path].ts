const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default async function handler(request: Request) {
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
    // Parse the URL to get path and query parameters
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Extract the path after /api/
    // The catch-all route will have the path in the URL
    // e.g., /api/search/companies -> path is "search/companies"
    // Handle both with and without leading slash
    let path = pathname.replace(/^\/api\//, '').replace(/^\/api$/, '');
    
    // If path is empty, try to get it from the URL search params (fallback)
    if (!path && url.searchParams.has('path')) {
      path = url.searchParams.get('path') || '';
    }

    // Build the full URL to Companies House API
    // Ensure path doesn't have leading/trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const targetUrl = cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
    
    // Forward query parameters from the original request
    const searchParams = url.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    // Log for debugging (will appear in Vercel function logs)
    console.log('Proxying request:', {
      originalPath: pathname,
      extractedPath: path,
      cleanPath,
      targetUrl: fullUrl,
    });

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
}
