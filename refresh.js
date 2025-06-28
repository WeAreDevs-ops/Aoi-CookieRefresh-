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

        // Extract the .ROBLOSECURITY cookie value from the Set-Cookie header
        const roblosecurityMatch = refreshedCookieData.match(/\.ROBLOSECURITY=([^;]+)/);
        
        if (!roblosecurityMatch || roblosecurityMatch.length < 2) {
            throw new Error('Failed to extract refreshed cookie from response');
        }

        const refreshedCookie = roblosecurityMatch[1];
        
        // Verify it's a valid Roblox cookie format
        if (!refreshedCookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
            throw new Error('Invalid refreshed cookie format received');
        }

        return {
            success: true,
            refreshedCookie: refreshedCookie
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
