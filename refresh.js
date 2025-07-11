const axios = require('axios');

async function fetchSessionCSRFToken(roblosecurityCookie) {
    try {
        await axios.post("https://auth.roblox.com/v2/logout", {}, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${roblosecurityCookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        return null;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout while fetching CSRF token');
        }
        return error.response?.headers["x-csrf-token"] || null;
    }
}

async function generateAuthTicket(roblosecurityCookie) {
    try {
        const csrfToken = await fetchSessionCSRFToken(roblosecurityCookie);
        
        if (!csrfToken) {
            throw new Error('Failed to obtain CSRF token');
        }

        const response = await axios.post("https://auth.roblox.com/v1/authentication-ticket", {}, {
            headers: {
                "x-csrf-token": csrfToken,
                "referer": "https://www.roblox.com/",
                'Content-Type': 'application/json',
                'Cookie': `.ROBLOSECURITY=${roblosecurityCookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const authTicket = response.headers['rbx-authentication-ticket'];
        if (!authTicket) {
            throw new Error('No authentication ticket received from Roblox');
        }

        return authTicket;
    } catch (error) {
        console.error('Error generating auth ticket:', error.message);
        return "Failed to fetch auth ticket";
    }
}

async function redeemAuthTicket(authTicket) {
    try {
        if (!authTicket || authTicket === "Failed to fetch auth ticket") {
            throw new Error('Invalid authentication ticket provided');
        }

        const response = await axios.post("https://auth.roblox.com/v1/authentication-ticket/redeem", {
            "authenticationTicket": authTicket
        }, {
            headers: {
                'RBXAuthenticationNegotiation': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const refreshedCookieData = response.headers['set-cookie']?.toString() || "";
        
        if (!refreshedCookieData) {
            throw new Error('No cookie data received from Roblox');
        }

        // Extract the full .ROBLOSECURITY cookie value
        const cookieMatch = refreshedCookieData.match(/\.ROBLOSECURITY=([^;]+)/);
        
        if (!cookieMatch || cookieMatch.length < 2) {
            console.error('Cookie extraction failed. Raw cookie data:', refreshedCookieData);
            throw new Error('Failed to extract refreshed cookie from response');
        }

        const extractedCookie = cookieMatch[1];
        
        // Validate that we got a proper Roblox cookie
        if (!extractedCookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
            console.error('Invalid cookie format extracted:', extractedCookie);
            throw new Error('Extracted cookie does not appear to be valid');
        }

        return {
            success: true,
            refreshedCookie: extractedCookie
        };
    } catch (error) {
        console.error('Error redeeming auth ticket:', error.message);
        return {
            success: false,
            robloxDebugResponse: error.response?.data,
            error: error.message
        };
    }
}

module.exports = {
    generateAuthTicket,
    redeemAuthTicket
};
