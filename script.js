document.addEventListener("DOMContentLoaded", function () {
    const authCookieInput = document.getElementById("authCookie");
    const refreshButton = document.getElementById("refreshButton");
    const resultElement = document.getElementById("result");
    const countdownElement = document.getElementById("countdown");

    // Input validation function
    function validateCookie(cookie) {
        if (!cookie || cookie.trim().length === 0) {
            return "Please enter a cookie";
        }
        if (!cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
            return "Invalid Roblox cookie format";
        }
        return null;
    }

    // Show error message
    function showError(message) {
        resultElement.textContent = message;
        resultElement.style.color = "#ff6b6b";
    }

    // Show success message
    function showSuccess(message) {
        resultElement.textContent = message;
        resultElement.style.color = "#51cf66";
    }

    // Show info message
    function showInfo(message) {
        resultElement.textContent = message;
        resultElement.style.color = "#74c0fc";
    }

    refreshButton.addEventListener("click", function () {
        const authCookie = authCookieInput.value.trim();
        
        // Validate input
        const validationError = validateCookie(authCookie);
        if (validationError) {
            showError(validationError);
            return;
        }

        refreshButton.disabled = true;
        const refreshButtonIcon = document.getElementById('refreshButtonIcon');
        refreshButtonIcon.classList.add('rotate-icon');
        
        showInfo("Please wait, your cookie is generating...");
        
        let countdown = 7;
        const countdownInterval = setInterval(function () {
            countdownElement.textContent = `Refreshing in ${countdown} seconds...`;
            countdown--;
            if (countdown < 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = "";
            }
        }, 1000);

        setTimeout(function () {
            fetch("/refresh?cookie=" + encodeURIComponent(authCookie), {
                method: "GET",
            })
                .then(async (response) => {
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || `HTTP error! status: ${response.status}`);
                    }
                    
                    return data;
                })
                .then((data) => {
                    if (data && data.redemptionResult && data.redemptionResult.refreshedCookie) {
                        showSuccess(data.redemptionResult.refreshedCookie);
                    } else {
                        showError("Failed to refresh cookie. No refreshed cookie received.");
                    }
                })
                .catch((error) => {
                    console.error('Refresh error:', error);
                    showError(error.message || "Error occurred while refreshing the cookie.");
                })
                .finally(() => {
                    refreshButton.disabled = false;
                    refreshButtonIcon.classList.remove('rotate-icon');
                });
        }, 7000);
    });

    const copyButton = document.getElementById("copyButton");
    copyButton.addEventListener("click", function () {
        const resultText = document.getElementById("result").textContent;
        
        // Check if there's a valid cookie to copy
        if (!resultText || !resultText.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
            showError("No valid cookie to copy!");
            return;
        }
        
        // Use modern clipboard API if available, fallback to old method
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(resultText).then(() => {
                copyButton.textContent = "Copied!";
                setTimeout(function () {
                    copyButton.textContent = "Copy";
                }, 1000);
            }).catch(() => {
                showError("Failed to copy to clipboard");
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement("textarea");
            textarea.value = resultText;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "absolute";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand("copy");
                copyButton.textContent = "Copied!";
                setTimeout(function () {
                    copyButton.textContent = "Copy";
                }, 1000);
            } catch (err) {
                showError("Failed to copy to clipboard");
            }
            
            document.body.removeChild(textarea);
        }
    });
});
