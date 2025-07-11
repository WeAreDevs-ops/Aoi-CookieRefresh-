
document.addEventListener("DOMContentLoaded", function () {
    const authCookieInput = document.getElementById("authCookie");
    const refreshButton = document.getElementById("refreshButton");
    const resultElement = document.getElementById("result");
    const countdownElement = document.getElementById("countdown");
    const copyButton = document.getElementById("copyButton");
    const spinner = document.getElementById("spinner");
    const buttonText = document.getElementById("buttonText");

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
        resultElement.className = "result-area error";
    }

    // Show success message
    function showSuccess(message) {
        resultElement.textContent = message;
        resultElement.className = "result-area success";
    }

    // Show info message
    function showInfo(message) {
        resultElement.textContent = message;
        resultElement.className = "result-area";
    }

    // Set loading state
    function setLoadingState(isLoading) {
        refreshButton.disabled = isLoading;
        if (isLoading) {
            spinner.style.display = "inline-block";
            buttonText.textContent = "Processing...";
        } else {
            spinner.style.display = "none";
            buttonText.textContent = "Refresh Cookie";
        }
    }

    refreshButton.addEventListener("click", function () {
        const authCookie = authCookieInput.value.trim();
        
        // Validate input
        const validationError = validateCookie(authCookie);
        if (validationError) {
            showError(validationError);
            return;
        }

        setLoadingState(true);
        showInfo("Generating your refreshed cookie...");
        
        let countdown = 5;
        const countdownInterval = setInterval(function () {
            countdownElement.textContent = `Processing... ${countdown}s`;
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
                    let data;
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/json')) {
                        try {
                            data = await response.json();
                        } catch (jsonError) {
                            throw new Error('Server returned invalid JSON response');
                        }
                    } else {
                        const textContent = await response.text();
                        console.error('Non-JSON response received:', textContent);
                        throw new Error('Server returned non-JSON response');
                    }
                    
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
                    setLoadingState(false);
                    clearInterval(countdownInterval);
                    countdownElement.textContent = "";
                });
        }, 5000);
    });

    copyButton.addEventListener("click", function () {
        const resultText = resultElement.textContent;
        
        // Check if there's a valid cookie to copy
        if (!resultText || !resultText.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
            showError("No valid cookie to copy!");
            return;
        }
        
        // Use modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(resultText).then(() => {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyButton.style.background = '#48bb78';
                copyButton.style.borderColor = '#48bb78';
                copyButton.style.color = 'white';
                
                setTimeout(function () {
                    copyButton.innerHTML = originalText;
                    copyButton.style.background = 'white';
                    copyButton.style.borderColor = '#667eea';
                    copyButton.style.color = '#667eea';
                }, 2000);
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
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyButton.style.background = '#48bb78';
                copyButton.style.borderColor = '#48bb78';
                copyButton.style.color = 'white';
                
                setTimeout(function () {
                    copyButton.innerHTML = originalText;
                    copyButton.style.background = 'white';
                    copyButton.style.borderColor = '#667eea';
                    copyButton.style.color = '#667eea';
                }, 2000);
            } catch (err) {
                showError("Failed to copy to clipboard");
            }
            
            document.body.removeChild(textarea);
        }
    });

    // Add input animation
    authCookieInput.addEventListener("focus", function() {
        this.parentElement.style.transform = "scale(1.02)";
    });

    authCookieInput.addEventListener("blur", function() {
        this.parentElement.style.transform = "scale(1)";
    });
});
