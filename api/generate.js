// api/generate.js

// Import the node-fetch library (version 2 allows 'require')
const fetch = require('node-fetch');

// --- Helper: Prepare request body based on provider ---
// Takes standard messages [{role: 'user'/'ai', content: '...'}], system prompt, modelId, providerId
// Returns the body object formatted for the specific provider API
function prepareRequestBody(providerId, modelId, standardMessages, systemPrompt) {
    let body = {};

    // Map frontend 'ai' role to standard 'assistant' role for most APIs
    const messagesWithAssistantRole = standardMessages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role, // 'user' remains 'user'
        content: msg.content
    }));

    // --- Provider Specific Formatting ---
    switch (providerId) {
        case 'gemini':
            // Google specific format (role: user/model, parts:[{text...}])
             let geminiContents = [];
             // Add system prompt as the very first part if provided
             if (systemPrompt) {
                 // Gemini doesn't have a dedicated system role in the 'contents' array.
                 // Prepend it to the first user message or handle it specially.
                 // Simple approach: Add it as the first part of the first turn, or potentially a separate turn.
                 // For simplicity, let's just log a warning if system prompt is provided but not handled ideally.
                 console.warn("System prompt for Gemini basic API might not be fully supported via 'contents'. Consider model-specific tuning or prepending to user message if needed.");
                 // Alternative: geminiContents.push({ role: 'user', parts: [{ text: systemPrompt }] }); // Less ideal
             }

             let currentRoleGemini = null;
             let combinedContentGemini = "";
             standardMessages.forEach(msg => {
                 const geminiRole = msg.role === 'ai' ? 'model' : 'user';
                 if (geminiRole === currentRoleGemini) {
                     combinedContentGemini += "\n\n" + msg.content;
                 } else {
                     if (currentRoleGemini && combinedContentGemini) {
                         geminiContents.push({ role: currentRoleGemini, parts: [{ text: combinedContentGemini }] });
                     }
                     currentRoleGemini = geminiRole;
                     combinedContentGemini = msg.content;
                 }
             });
             if (currentRoleGemini && combinedContentGemini) {
                 geminiContents.push({ role: currentRoleGemini, parts: [{ text: combinedContentGemini }] });
             }
            body = { contents: geminiContents };
            // Add generationConfig if needed, e.g.:
            // body.generationConfig = { "temperature": 0.7, "maxOutputTokens": 4096 };
            break;

        case 'anthropic':
            // Anthropic specific format (system prompt is separate parameter)
            body = {
                 model: modelId,
                 system: systemPrompt || undefined, // Pass system prompt if provided
                 messages: messagesWithAssistantRole, // Uses 'assistant' role
                 max_tokens: 4096 // Example: Anthropic often requires max_tokens
                 // temperature: 0.7 // Add other parameters as needed
            };
            break;

        // OpenAI compatible APIs (OpenRouter, Fireworks, Mistral) and potentially others
        case 'openrouter':
        case 'fireworksai':
        case 'mistralai':
        case 'vertexai': // Assuming Vertex AI chat endpoint takes similar *message structure*
        case 'cohere':   // Assuming Cohere v1 chat takes similar *message structure*
        default: // Catches any other provider potentially using OpenAI format
             let messagesForApi = [];
             // Add system message first if provided
             if (systemPrompt) {
                  messagesForApi.push({ role: 'system', content: systemPrompt });
             }
             // Add the rest of the user/assistant messages
             messagesForApi = messagesForApi.concat(messagesWithAssistantRole);

             // Base body structure
             body = {
                 model: modelId, // Model ID is usually required
                 messages: messagesForApi
             };

             // --- Provider-Specific Body Adjustments ---

             // Cohere v1 uses 'message' for the last user input and 'chat_history'
             if (providerId === 'cohere') {
                 // Find the last user message to use as the main 'message'
                 const lastUserMessageIndex = messagesForApi.map(m => m.role).lastIndexOf('user');
                 if (lastUserMessageIndex !== -1) {
                     body.message = messagesForApi[lastUserMessageIndex].content;
                     // History includes system prompt and messages *before* the last user message
                     body.chat_history = messagesForApi.slice(0, lastUserMessageIndex);
                     // Remove the now redundant 'messages' and 'model' keys from the base body
                     delete body.messages;
                     delete body.model; // Model ID might be handled differently by Cohere, check docs (often header/URL)
                     // Map roles for chat_history if needed (e.g., 'assistant' -> 'CHATBOT')
                     body.chat_history = body.chat_history.map(m => ({
                         role: m.role === 'assistant' ? 'CHATBOT' : m.role.toUpperCase(), // USER, SYSTEM, CHATBOT
                         message: m.content
                     }));
                     // Ensure last user message content is not empty
                     if (!body.message) {
                        throw new Error("Cohere requires a non-empty final user message.");
                     }
                 } else {
                     // Handle cases where there's no user message (e.g., only system prompt)
                     // Cohere might require at least one user message.
                     throw new Error("Cohere requires at least one user message in the history.");
                 }
                 // Add other Cohere parameters if needed, e.g., temperature, connectors
                 // body.temperature = 0.7;
             }
             // Vertex AI 'predict' endpoint often needs 'instances' wrapper
             else if (providerId === 'vertexai') {
                 // Vertex AI predict endpoint expects a specific 'instances' structure
                 body = {
                     instances: [{ messages: messagesForApi }], // Wrap messages
                     // Parameters are separate
                     // parameters: { temperature: 0.7, maxOutputTokens: 4096 }
                 };
                 // Vertex doesn't use 'model' in the *body* for predict, it's in the URL
                 // System prompt handling is complex; often needs to be first message.
                 // Ensure system message is first if present.
                 if (systemPrompt && body.instances[0].messages[0]?.role !== 'system') {
                    const systemIndex = body.instances[0].messages.findIndex(m => m.role === 'system');
                    if (systemIndex > 0) {
                        const systemMsg = body.instances[0].messages.splice(systemIndex, 1)[0];
                        body.instances[0].messages.unshift(systemMsg);
                    } else if (systemIndex === -1) {
                        // This case shouldn't happen if added earlier, but as safety:
                        body.instances[0].messages.unshift({ role: 'system', content: systemPrompt });
                    }
                 }
             }
             // Default OpenAI-like structure (no changes needed for openrouter, fireworks, mistralai)
             // Add common parameters if desired:
             // body.temperature = 0.7;
             // body.max_tokens = 4096;
             break;
    }
    return body;
}

// --- Main Serverless Function Handler ---
module.exports = async (req, res) => {
    // --- CORS Headers ---
    // Allow requests from all origins in development. Restrict in production.
    const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*'); // Fallback to '*' if env var not set
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key'); // Allow custom headers if needed

    // --- Handle OPTIONS request (for CORS preflight) ---
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return res.status(200).end();
    }

    // --- Only allow POST requests ---
    if (req.method !== 'POST') {
        console.log(`Method Not Allowed attempt: ${req.method}`);
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
    console.log('Handling POST request for AI generation');

    // --- Get data from Frontend Request Body ---
    let requestData;
    try {
        requestData = req.body; // Already parsed by Vercel
        if (!requestData || typeof requestData !== 'object') {
            throw new Error("Invalid JSON payload");
        }
    } catch (e) {
         console.error("Bad Request: Failed to parse JSON body", e);
         return res.status(400).json({ error: { message: 'Invalid JSON request body.' } });
    }

    const { providerId, modelId, messages, systemPrompt, apiKey: apiKeyFromRequest } = requestData;

    // Basic validation
    if (!providerId || !modelId || !messages || !Array.isArray(messages)) {
        console.error('Bad Request: Missing required parameters', { providerId: !!providerId, modelId: !!modelId, messagesExists: !!messages });
        return res.status(400).json({ error: { message: 'Missing or invalid parameters: "providerId", "modelId", and "messages" array are required.' } });
    }
    // We MUST receive the API key from the frontend request for this setup
    if (!apiKeyFromRequest) {
        console.error(`Bad Request: API Key missing in request body for provider ${providerId}.`);
        return res.status(400).json({ error: { message: `API Key for provider '${providerId}' was not provided in the request.` }});
    }
    console.log(`Received request for Provider: ${providerId}, Model: ${modelId}`);

    // --- Select API Endpoint and Prepare Headers ---
    // API Key is now taken *directly* from the request body
    const apiKey = apiKeyFromRequest;
    let apiUrl = null;
    let headers = { 'Content-Type': 'application/json' };

    // Set API URL and provider-specific headers using the received apiKey
    switch (providerId) {
        case 'gemini':
            // Key is appended to URL for Google AI Studio
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
            break;
        case 'openrouter':
            apiUrl = "https://openrouter.ai/api/v1/chat/completions";
            headers['Authorization'] = `Bearer ${apiKey}`;
            // Add required OpenRouter headers
            headers['HTTP-Referer'] = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'; // Adjust for your domain
            headers['X-Title'] = 'Creative Quill Studio'; // Optional but recommended
            break;
        case 'fireworksai':
            apiUrl = "https://api.fireworks.ai/inference/v1/chat/completions";
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['Accept'] = `application/json`;
            break;
        case 'mistralai':
             apiUrl = "https://api.mistral.ai/v1/chat/completions";
             headers['Authorization'] = `Bearer ${apiKey}`;
             headers['Accept'] = `application/json`;
             break;
        case 'anthropic':
             apiUrl = "https://api.anthropic.com/v1/messages";
             // Anthropic requires specific headers
             headers['x-api-key'] = apiKey; // Use x-api-key header
             headers['anthropic-version'] = '2023-06-01'; // Required version
             headers['content-type'] = 'application/json'; // Ensure content-type
             // Remove Authorization header if x-api-key is used
             delete headers['Authorization'];
             break;
        case 'vertexai':
             // Vertex AI requires more setup: Project ID, Location, and often OAuth/Service Account Auth
             // Assuming the 'apiKey' passed from frontend IS the Bearer ACCESS TOKEN for simplicity here.
             // For production, use Application Default Credentials or Service Accounts securely.
             const projectId = process.env.VERTEXAI_PROJECT_ID; // MUST be set in Vercel env
             const location = process.env.VERTEXAI_LOCATION || 'us-central1'; // Set in Vercel env or default
             if (!projectId) {
                 console.error("SERVER CONFIGURATION ERROR: VERTEXAI_PROJECT_ID environment variable is not set.");
                 return res.status(500).json({ error: { message: "Vertex AI Project ID is not configured on the server." }});
             }
             apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`; // Adjust if using specific model publisher
             headers['Authorization'] = `Bearer ${apiKey}`; // apiKey here IS the access token
             break;
        case 'cohere':
             apiUrl = "https://api.cohere.ai/v1/chat"; // Cohere chat endpoint
             headers['Authorization'] = `Bearer ${apiKey}`;
             headers['cohere-version'] = '2022-12-06'; // Example version, check latest
             break;
        default:
            console.error(`Unsupported providerId received: ${providerId}`);
            return res.status(400).json({ error: { message: `Provider '${providerId}' is not supported by this backend.` } });
    }

    // --- Prepare Request Body ---
    let finalRequestBody;
    try {
        finalRequestBody = prepareRequestBody(providerId, modelId, messages, systemPrompt);
        console.log(`Prepared request body for ${providerId}:`, JSON.stringify(finalRequestBody).substring(0, 300) + '...');
    } catch (error) {
        console.error(`Error preparing request body for ${providerId}:`, error);
        return res.status(400).json({ error: { message: `Failed to prepare request for ${providerId}: ${error.message}` } });
    }

    // --- Make the API Call ---
    try {
        console.log(`Forwarding request to ${providerId} API endpoint: ${apiUrl}`);
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(finalRequestBody)
        });

        // Log raw response status and headers for debugging
        // console.log(`Response Status: ${apiResponse.status}`);
        // console.log('Response Headers:', apiResponse.headers);

        let apiData;
        const contentType = apiResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                apiData = await apiResponse.json();
            } catch (jsonError) {
                 console.error(`Failed to parse JSON response from ${providerId} (Status: ${apiResponse.status}, Content-Type: ${contentType})`, jsonError);
                 const rawTextResponse = await apiResponse.text().catch(() => '(Could not read raw text response)');
                 console.error('Raw text response snippet:', rawTextResponse.substring(0, 500));
                return res.status(502).json({
                    error: { message: `Received an invalid JSON response from the ${providerId} API.`, code: 502, status: "INVALID_JSON_RESPONSE" },
                    details: `Status: ${apiResponse.status}. Response snippet: ${rawTextResponse.substring(0, 200)}`
                });
            }
        } else {
            // Handle non-JSON responses (e.g., plain text errors, HTML errors)
            const rawTextResponse = await apiResponse.text().catch(() => `(Could not read raw text response from ${providerId})`);
             console.error(`Received non-JSON response from ${providerId} (Status: ${apiResponse.status}, Content-Type: ${contentType || 'N/A'})`);
             console.error('Raw text response snippet:', rawTextResponse.substring(0, 500));
             // Return a structured error
             const statusCode = (apiResponse.status >= 100 && apiResponse.status < 600) ? apiResponse.status : 502; // Use 502 for bad gateway if status is weird
             return res.status(statusCode).json({
                 error: { message: `Received a non-JSON response from the ${providerId} API.`, code: statusCode, status: "NON_JSON_RESPONSE" },
                 details: `Status: ${apiResponse.status}. Content-Type: ${contentType || 'N/A'}. Response snippet: ${rawTextResponse.substring(0, 200)}`
             });
        }


        // --- Handle API Errors (using parsed JSON data) ---
        if (!apiResponse.ok) {
            console.error(`${providerId} API Error Response (Status: ${apiResponse.status}):`, JSON.stringify(apiData));
             const statusCode = (apiResponse.status >= 100 && apiResponse.status < 600) ? apiResponse.status : 500;
            // Try to extract a meaningful error message from common structures
            let errorDetail = apiData?.error?.message || // OpenAI, Google, Vertex?
                              apiData?.error?.error?.message || // Nested error object?
                              apiData?.detail || // FastAPI?
                              apiData?.message || // Cohere, some others?
                              (typeof apiData?.error === 'string' ? apiData.error : null) ||
                              JSON.stringify(apiData); // Fallback

             let errorCode = apiData?.error?.code || // OpenAI, Google?
                             apiData?.error?.type || // Anthropic
                             apiData?.code || // Cohere?
                             apiResponse.status; // Fallback to HTTP status

            return res.status(statusCode).json({ error: { message: String(errorDetail), code: errorCode, statusText: apiResponse.statusText }});
        }

        // --- Handle Provider-Specific Success Issues (e.g., content filtering) ---
        if (providerId === 'gemini' && apiData.promptFeedback?.blockReason) {
            console.warn("Gemini API Response Blocked:", apiData.promptFeedback);
            return res.status(400).json({ error: { message: `Content blocked by Google safety filters. Reason: ${apiData.promptFeedback.blockReason}`, code: 400, status: "BLOCKED_BY_SAFETY_FILTER" }});
        }
        if (providerId === 'anthropic' && apiData.stop_reason === 'max_tokens') {
            console.warn("Anthropic response truncated due to max_tokens limit.");
            // Optionally add info to the response data for frontend?
            // apiData._warning = "Response truncated by max_tokens limit.";
        }
        if (providerId === 'vertexai' && apiData.predictions?.[0]?.safetyAttributes?.blocked) {
              console.warn("Vertex AI Response Blocked:", apiData.predictions[0].safetyAttributes);
              return res.status(400).json({ error: { message: `Content blocked by Vertex AI safety filters.`, code: 400, status: "BLOCKED_BY_SAFETY_FILTER" }});
        }
        // Check for empty but successful responses which might indicate issues
        if (providerId === 'gemini' && !apiData.candidates?.[0]?.content?.parts?.[0]?.text && apiData.candidates?.[0]?.finishReason === 'STOP') {
             console.warn("Gemini API response OK (STOP) but no text candidate found:", apiData);
             // Decide if this is an error or acceptable empty response
             // return res.status(200).json(apiData); // Send it anyway, frontend handles parsing
        }
        if (providerId === 'vertexai' && !apiData.predictions?.[0]?.content && !apiData.predictions?.[0]?.candidates?.[0]?.content) {
              console.warn("Vertex AI response OK but content appears missing:", apiData);
              // Decide if this is an error or acceptable empty response
              // return res.status(200).json(apiData); // Send it anyway
        }


        // --- Success ---
        console.log(`Successfully received and processed response from ${providerId} API.`);
        res.status(200).json(apiData); // Send the raw provider data back

    } catch (error) {
        // Catch internal server errors (e.g., network issues connecting to AI Provider)
        console.error(`Internal Server Error during fetch to ${providerId} API:`, error);
        res.status(500).json({
            error: {
                message: `An internal server error occurred while attempting to contact the ${providerId} AI service.`,
                code: 500,
                status: "INTERNAL_SERVER_ERROR"
            },
            details: error.message // Include raw error message for debugging
        });
    }
};
