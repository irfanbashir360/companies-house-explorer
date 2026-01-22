// Vercel serverless function types
interface VercelRequest {
    query: { [key: string]: string | string[] | undefined };
    method?: string;
}

interface VercelResponse {
    status: (code: number) => VercelResponse;
    json: (data: any) => void;
}

const API_BASE_URL = 'https://api.company-information.service.gov.uk';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Get API key from environment variable
    const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({
            error: 'API key not configured. Please set COMPANIES_HOUSE_API_KEY in Vercel environment variables.'
        });
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the path from the catch-all route
        const path = Array.isArray(req.query.path)
            ? req.query.path.join('/')
            : req.query.path || '';

        // Build the full URL
        const url = `${API_BASE_URL}/${path}`;

        // Forward query parameters
        const queryParams = new URLSearchParams();
        Object.entries(req.query).forEach(([key, value]) => {
            if (key !== 'path' && value) {
                if (Array.isArray(value)) {
                    value.forEach(v => queryParams.append(key, v));
                } else {
                    queryParams.append(key, value);
                }
            }
        });

        const fullUrl = queryParams.toString()
            ? `${url}?${queryParams.toString()}`
            : url;

        // Make the request to Companies House API
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
        });

        // Get response data
        const data = await response.json();

        // Forward the status code and data
        res.status(response.status).json(data);
    } catch (error: any) {
        console.error('API Proxy Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
