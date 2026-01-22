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
      
      // Try to get company number from query param (if rewrite passes it)
      let companyNumber = url.searchParams.get('companyNumber') || '';
      
      // If not in query, extract from pathname
      if (!companyNumber) {
        const pathParts = url.pathname.split('/').filter(p => p);
        // pathParts will be: ['api', 'company', '16442064'] or ['api', 'company']
        companyNumber = pathParts[2] || '';
      }
      
      // If still not found, try to get from original URL header
      if (!companyNumber) {
        const originalUrl = request.headers.get('x-vercel-original-url');
        if (originalUrl) {
          try {
            const originalPathname = new URL(originalUrl).pathname;
            const parts = originalPathname.split('/').filter(p => p);
            companyNumber = parts[2] || '';
          } catch {
            // If it's just a path
            const parts = originalUrl.split('/').filter(p => p);
            companyNumber = parts[2] || '';
          }
        }
      }
      
      if (!companyNumber) {
        return new Response(
          JSON.stringify({ 
            error: 'Company number not provided',
            debug: { pathname: url.pathname, url: request.url }
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const targetUrl = `${API_BASE_URL}/company/${companyNumber}`;
      const queryString = url.searchParams.toString().replace(/companyNumber=[^&]*&?/g, '').replace(/&$/, '');
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
