const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default {
  async fetch(request: Request): Promise<Response> {
    // Get API key from environment variable
    const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const url = new URL(request.url);
      const targetUrl = `${API_BASE_URL}/search/companies`;
      const queryString = url.searchParams.toString();
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      // Create Basic Auth header - Companies House API expects: Basic base64(api_key:)
      const authHeader = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      // Handle both success and error responses
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

      // Return the response with the same status code
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
