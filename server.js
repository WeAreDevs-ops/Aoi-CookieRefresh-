
const express = require('express');
const path = require('path');

const { generateAuthTicket, redeemAuthTicket } = require('./refresh');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Input validation middleware
const validateCookie = (req, res, next) => {
    const cookie = req.query.cookie;
    
    if (!cookie) {
        return res.status(400).json({ error: "Cookie parameter is required" });
    }
    
    if (typeof cookie !== 'string' || cookie.trim().length === 0) {
        return res.status(400).json({ error: "Invalid cookie format" });
    }
    
    // Basic validation for Roblox cookie format
    if (!cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
        return res.status(400).json({ error: "Invalid Roblox cookie format" });
    }
    
    next();
};

app.get('/refresh', validateCookie, async (req, res) => {
    const roblosecurityCookie = req.query.cookie.trim();

    try {
        const authTicket = await generateAuthTicket(roblosecurityCookie);

        if (authTicket === "Failed to fetch auth ticket") {
            return res.status(400).json({ error: "Invalid cookie or failed to generate auth ticket" });
        }

        const redemptionResult = await redeemAuthTicket(authTicket);

        if (!redemptionResult.success) {
            if (redemptionResult.robloxDebugResponse && redemptionResult.robloxDebugResponse.status === 401) {
                return res.status(401).json({ error: "Unauthorized: The provided cookie is invalid." });
            } else {
                return res.status(400).json({ error: "Failed to refresh cookie. Please check if your cookie is valid." });
            }
        }

        const refreshedCookie = redemptionResult.refreshedCookie || '';

        if (!refreshedCookie) {
            return res.status(500).json({ error: "Cookie refresh completed but no refreshed cookie received" });
        }

        // Return only the necessary data without logging sensitive information
        res.json({ 
            authTicket, 
            redemptionResult: {
                success: true,
                refreshedCookie: refreshedCookie
            }
        });
    } catch (error) {
        console.error('Error in /refresh endpoint:', error.message);
        res.status(500).json({ error: "Internal server error occurred while refreshing cookie" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on host 0.0.0.0 port ${PORT}`);
});
