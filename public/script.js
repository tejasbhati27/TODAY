// ========================================================================
// Creative Quill Studio - script.js (Complete + T2I/T2S/Puter Models v4)
// ========================================================================

// Wait for the HTML document to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Fully Loaded. Initializing Full Script (v4 - Addable Puter Models)...");

    // --- Get Core Elements Needed Early (Essential for basic UI interaction) ---
    const appContainer = document.getElementById('app-container');
    const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    const toggleControlsBtn = document.getElementById('toggle-controls-btn');

    // --- VERIFY CORE ELEMENTS ---
    if (!appContainer) { console.error("FATAL ERROR: #app-container NOT FOUND!"); alert("Error: Cannot find #app-container."); return; }
    if (!toggleHistoryBtn) { console.error("ERROR: #toggle-history-btn NOT FOUND."); }
    if (!toggleControlsBtn) { console.error("ERROR: #toggle-controls-btn NOT FOUND."); }
    console.log("Core toggle elements checked.");

    // --- Sidebar Management Functions (Essential for toggles) ---
    function toggleSidebar(sidebarType) {
        console.log(`==> toggleSidebar called for: ${sidebarType}`);
        if (!appContainer) { console.error("RUNTIME ERROR: appContainer missing!"); return; }
        const isHistory = sidebarType === 'history';
        const targetClass = isHistory ? 'history-visible' : 'controls-visible';
        const otherClass = isHistory ? 'controls-visible' : 'history-visible';
        const isTargetVisible = appContainer.classList.contains(targetClass);
        console.log(`    Target class: ${targetClass}, Currently visible: ${isTargetVisible}`);
        if (window.innerWidth <= 768) {
            // Close other sidebar if opening a new one on mobile
            if (!isTargetVisible && appContainer.classList.contains(otherClass)) {
                console.log(`    Closing other sidebar (${otherClass}).`);
                appContainer.classList.remove(otherClass);
            }
        }
        appContainer.classList.toggle(targetClass);
        console.log(`    Toggled ${targetClass}. Current classes:`, appContainer.classList.toString());
        handleMobileOverlay(); // Update overlay state regardless of screen size check here
    }
    function closeSidebars() {
        console.log("==> closeSidebars called");
        if (!appContainer) { console.error("RUNTIME ERROR: appContainer missing!"); return; }
        appContainer.classList.remove('history-visible', 'controls-visible');
        handleMobileOverlay(); // Update overlay state
    }
    function handleMobileOverlay() {
         if (!appContainer) return;
         const isOverlayNeeded = window.innerWidth <= 768;
         const isSidebarVisible = appContainer.classList.contains('history-visible') || appContainer.classList.contains('controls-visible');
         appContainer.classList.toggle('overlay-active', isOverlayNeeded && isSidebarVisible);
         // console.log("    Mobile overlay state update. Needed:", isOverlayNeeded, "Visible:", isSidebarVisible); // Less verbose log
    }

    // --- ATTACH Early Listeners (Toggles & Overlay) ---
    if (toggleHistoryBtn) {
        console.log("Attaching listener to History button.");
        toggleHistoryBtn.addEventListener('click', () => toggleSidebar('history'));
    }
    if (toggleControlsBtn) {
        console.log("Attaching listener to Controls button.");
        toggleControlsBtn.addEventListener('click', () => toggleSidebar('controls'));
    }
    if (appContainer) {
        console.log("Attaching listener to App container (overlay).");
        appContainer.addEventListener('click', function(event) {
            if (event.target === appContainer && appContainer.classList.contains('overlay-active')) {
                 console.log(">>> Mobile overlay background CLICKED!");
                 closeSidebars();
            }
        });
    }
    console.log("Essential listeners attached.");
    // Update overlay state on resize
    window.addEventListener('resize', handleMobileOverlay);


    // --- Get ALL Other UI Elements ---
    let elementsOK = true; // Flag to track element finding
    const getElement = (id, critical = false) => {
        const el = document.getElementById(id);
        if (!el) { console.error(`${critical ? 'FATAL' : 'Error'}: ID '${id}' not found.`); if (critical) elementsOK = false; }
        return el;
    };
    const querySelector = (selector, critical = false) => { const el = document.querySelector(selector); if (!el) { console.error(`${critical ? 'FATAL' : 'Error'}: Selector '${selector}' not found.`); if (critical) elementsOK = false; } return el; };

    // Layout & Core Interaction
    const chatHistorySidebar = getElement('chat-history-sidebar');
    const studioControlsSidebar = getElement('studio-controls-sidebar');
    const mainContentArea = getElement('main-content-area');
    const chatInput = getElement('chat-input', true);
    const generateBtn = getElement('generate-btn', true);
    const chatView = getElement('chat-view', true);
    const chatListUl = getElement('chat-list');
    const newChatBtn = getElement('new-chat-btn');

    // Controls Sidebar Specific
    const controlsContent = getElement('controls-content');
    const generalToggle = getElement('general-tools-toggle');
    const structuredOutputToggle = getElement('structured-output-toggle');
    const writingModeSelect = getElement('writing-mode-select');
    const speechFocusControls = getElement('speech-focus-controls');
    const providerSelect = getElement('provider-select', true);
    const apiKeyInput = getElement('api-key-input');
    const apiKeyLabel = querySelector('label[for="api-key-input"]');
    const apiKeyGroup = querySelector('.api-key-group');
    const puterPlaceholder = querySelector('.api-key-placeholder-puter');
    const modelSelect = getElement('model-select', true);
    const newModelInputGroup = querySelector('.add-model-container'); // Get the container div
    const newModelInput = getElement('new-model-input');
    const addModelBtn = getElement('add-model-btn');
    const saveApiConfigBtn = getElement('save-api-config-btn');
    const configStatus = querySelector('.config-status');
    const apiConfigSection = querySelector('.control-group.api-config');
    const apiConfigToggleBtn = getElement('api-config-toggle');
    const apiConfigContent = getElement('api-config-content');
    const addModelLabel = querySelector('label[for="new-model-input"]');

    // File Upload Related
    const fileInput = getElement('file-input');
    const uploadBtn = getElement('upload-btn');
    const uploadStatus = getElement('upload-status');

    // Text-to-Image Elements
    const generateImageBtn = getElement('generate-image-btn');
    const imageOutputArea = getElement('image-output-area');
    const generatedImage = getElement('generated-image');
    const imageStatus = getElement('image-status');


    // --- Stop if critical elements are missing ---
    if (!elementsOK) {
        alert("Error: One or more critical UI components are missing. Application cannot function correctly. Check console (F12) for details.");
        if(appContainer) appContainer.style.opacity = '0.5'; // Dim the UI
        return; // Halt script execution
    }
    console.log("All required UI elements checked/found.");

    // --- State Variables ---
    let chatHistory = [];
    let currentChatId = null;
    let apiConfigurations = { selectedProvider: '', providers: {} };
    let temporaryAiMessageElement = null;
    let isGeneratingImage = false;
    let isGeneratingChat = false; // Added flag for chat generation
    let isPlayingSpeech = false;

    // --- Backend API Endpoint ---
    const GENERATE_API_ENDPOINT = '/api/generate'; // Relative path for Vercel function

    // --- Base List of Known Puter Chat Models ---
    const BASE_PUTER_CHAT_MODELS = [
        // This list serves as the *initial* set. User can add more.
        'gpt-4o-mini', // Default
        'gpt-4o',
        'o3-mini',
        'o1-mini',
        'claude-3-5-sonnet-20240620',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'deepseek-chat',
        'deepseek-coder',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'meta-llama/Llama-3-8b-chat-hf',
        'meta-llama/Llama-3-70b-chat-hf',
        'mistral-large-latest',
        'codestral-latest',
        'mistral-7b-instruct-v0.3',
        'mixtral-8x7b-instruct-v0.1',
        'gemma-7b-it',
        'grok-1',
        'command-r-plus',
        'command-r',
    ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // Sort alphabetically

    const DEFAULT_PUTER_MODEL = 'gpt-4o-mini'; // Default if none selected/valid


    // ========================================================================
    // Configuration Management Functions
    // ========================================================================

    function getDefaultProviderConfig() {
        // For Puter, initialize knownModels with the base list
        return { apiKey: '', selectedModel: '', knownModels: [] };
    }

    // Helper to merge base Puter models with user-added ones
    function getCombinedPuterModels(savedKnownModels = []) {
        const combined = new Set([...BASE_PUTER_CHAT_MODELS, ...(savedKnownModels || [])]);
        return Array.from(combined).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }

    // Load config, wrap localStorage access in try/catch
    function loadApiConfig() {
        console.log("Loading API config...");
        let savedConfig = null;
        try {
            savedConfig = localStorage.getItem('apiConfigurations');
        } catch (e) {
            console.error("Error reading API configurations from localStorage:", e);
            displayConfigStatus("Could not load saved config (storage read error).", "error");
        }

        if (savedConfig) {
            try {
                apiConfigurations = JSON.parse(savedConfig);
                if (!apiConfigurations || typeof apiConfigurations !== 'object') throw new Error("Invalid config format");
                if (!apiConfigurations.providers || typeof apiConfigurations.providers !== 'object') apiConfigurations.providers = {};
                if (typeof apiConfigurations.selectedProvider !== 'string') apiConfigurations.selectedProvider = '';

                // Ensure Puter provider exists and merge models if necessary
                if (apiConfigurations.providers['puter']) {
                    apiConfigurations.providers['puter'].knownModels = getCombinedPuterModels(apiConfigurations.providers['puter'].knownModels);
                } else {
                    // Initialize Puter provider if it was missing but might be selected
                     apiConfigurations.providers['puter'] = getDefaultProviderConfig();
                     apiConfigurations.providers['puter'].knownModels = [...BASE_PUTER_CHAT_MODELS];
                }

            } catch (e) {
                console.error("Error parsing saved API configurations:", e);
                apiConfigurations = { selectedProvider: '', providers: {} }; // Reset to default
                try { localStorage.removeItem('apiConfigurations'); } catch (removeError) { console.error("Failed to remove corrupted config:", removeError); }
                 displayConfigStatus("Saved config was corrupted, resetting.", "error");
            }
        } else {
            apiConfigurations = { selectedProvider: '', providers: {} };
            // Initialize Puter on first load
            apiConfigurations.providers['puter'] = getDefaultProviderConfig();
            apiConfigurations.providers['puter'].knownModels = [...BASE_PUTER_CHAT_MODELS];
        }

        if (providerSelect) providerSelect.value = apiConfigurations.selectedProvider || "";
        updateUiForProvider(apiConfigurations.selectedProvider); // Call this AFTER parsing/setting defaults

        const currentProviderId = apiConfigurations.selectedProvider;
        const currentProviderConfig = apiConfigurations.providers[currentProviderId] || {};
        const isPuter = currentProviderId === 'puter';
        const configIsSet = !!(currentProviderId && (isPuter || currentProviderConfig.apiKey));

        if (configIsSet && apiConfigSection) apiConfigSection.classList.add('collapsed');
        else if (apiConfigSection) apiConfigSection.classList.remove('collapsed');
    }

    // Update UI based on provider selection (handles Puter specifically)
    function updateUiForProvider(providerId) {
        console.log(`Updating UI for provider: ${providerId || 'None'}`);
        const isPuter = providerId === 'puter';

        // Ensure provider config exists, especially for Puter on first load/switch
        if (!apiConfigurations.providers[providerId]) {
            apiConfigurations.providers[providerId] = getDefaultProviderConfig();
            if (isPuter) {
                apiConfigurations.providers[providerId].knownModels = [...BASE_PUTER_CHAT_MODELS];
            }
        }
        const providerConfig = apiConfigurations.providers[providerId]; // Now guaranteed to exist

        // API Key Visibility
        if (apiKeyGroup) apiKeyGroup.style.display = isPuter ? 'none' : 'block';
        if (puterPlaceholder) puterPlaceholder.style.display = isPuter ? 'block' : 'none';
        if (apiConfigContent) { apiConfigContent.classList.toggle('puter-selected', isPuter); }
        if (apiKeyInput) apiKeyInput.value = isPuter ? '' : (providerConfig.apiKey || '');
        updateApiKeyLabel(providerId);

        // Model Dropdown and Add Model Section
        let availableModels = providerConfig.knownModels || [];
        let selectedModel = providerConfig.selectedModel || '';

        if (isPuter) {
            // Get combined list (base + user-added) for Puter
            availableModels = getCombinedPuterModels(providerConfig.knownModels);
             // Ensure the combined list is stored back if it changed
             if (JSON.stringify(providerConfig.knownModels) !== JSON.stringify(availableModels)) {
                 providerConfig.knownModels = availableModels;
             }
             // Validate selected model against the *combined* list
             if (!availableModels.includes(selectedModel)) {
                 console.warn(`Selected Puter model '${selectedModel}' not found in combined list. Resetting to default.`);
                 selectedModel = DEFAULT_PUTER_MODEL; // Use default if invalid
                 providerConfig.selectedModel = selectedModel; // Update config state
             }
             // *** MODIFICATION: Enable Add Model for Puter ***
             if (newModelInput) {
                 newModelInput.disabled = false;
                 newModelInput.placeholder = "Add Puter Model ID (e.g., gpt-4o)";
             }
             if (addModelBtn) addModelBtn.disabled = false;
             if (newModelInputGroup) newModelInputGroup.style.display = 'block';
             if (addModelLabel) addModelLabel.style.display = 'block';

        } else {
            // Non-Puter provider
            if (newModelInput) {
                 newModelInput.disabled = false;
                 newModelInput.placeholder = "e.g., provider/model-name";
             }
             if (addModelBtn) addModelBtn.disabled = false;
             if (newModelInputGroup) newModelInputGroup.style.display = 'block';
             if (addModelLabel) addModelLabel.style.display = 'block';
        }

        populateModelDropdown(availableModels, selectedModel);

        if (newModelInput) newModelInput.value = ''; // Clear add model input
        displayConfigStatus("", ""); // Clear status message
    }

    // Update the label for the API key input based on provider
    function updateApiKeyLabel(providerId) {
        let labelText = "API Key / Identifier";
        if (providerId === 'puter') {
            labelText = "API Key (Not Required for Puter Chat)";
        } else {
             switch (providerId) {
                 case 'openrouter': labelText = 'OpenRouter API Key'; break;
                 case 'vertexai': labelText = 'Vertex AI Access Token / Key Info'; break; // Updated label
                 case 'gemini': labelText = 'Google AI Studio API Key'; break;
                 case 'fireworksai': labelText = 'Fireworks AI API Key'; break;
                 case 'mistralai': labelText = 'Mistral AI API Key'; break;
                 case 'cohere': labelText = 'Cohere API Key'; break;
                 case 'anthropic': labelText = 'Anthropic API Key'; break;
             }
        }
        if (apiKeyLabel) apiKeyLabel.textContent = labelText;
        if (apiKeyInput) apiKeyInput.placeholder = (providerId === 'puter') ? '(Not applicable for Puter)' : `Enter ${labelText} (Stored locally)`;
    }

    // Populate the model selection dropdown
    function populateModelDropdown(modelIds = [], selectedId = null) {
        if (!modelSelect) return;
        modelSelect.innerHTML = ''; // Clear existing

        const currentProvider = providerSelect ? providerSelect.value : '';

        if (!modelIds || modelIds.length === 0) {
             // Updated logic: Show "Add Model Below" even for Puter if list is somehow empty
             const defaultOption = document.createElement('option');
             defaultOption.value = "";
             if (currentProvider) {
                 defaultOption.textContent = "-- Add Model ID Below --";
             } else {
                 defaultOption.textContent = "-- Select Provider First --";
             }
             modelSelect.appendChild(defaultOption);
             modelSelect.value = "";
             return;
        }

        const placeholderNeeded = !selectedId && modelIds.length > 0;
        if (placeholderNeeded) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = ""; placeholderOption.textContent = "-- Select Chat Model --";
            modelSelect.appendChild(placeholderOption);
        }

        modelIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id; option.textContent = id;
            modelSelect.appendChild(option);
        });

        modelSelect.value = selectedId || ""; // Attempt to set selected
        if (!modelSelect.value && placeholderNeeded) {
            modelSelect.value = ""; // Fallback to placeholder if selection invalid
        } else if (!modelSelect.value && !placeholderNeeded && modelIds.length > 0) {
            // If no placeholder and no valid selection, select the first model
            modelSelect.value = modelIds[0];
             console.log(`No valid selection, defaulted to first model: ${modelSelect.value}`);
        }
        console.log(`Models populated for '${currentProvider || 'N/A'}'. Selected: '${modelSelect.value || 'None'}'`);
    }

    // Saves config to localStorage ONLY
    function saveApiConfig() {
        if (!providerSelect || !modelSelect) return; // Need core elements

        const selectedProviderId = providerSelect.value;
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        const selectedModelId = modelSelect.value;
        const isPuter = selectedProviderId === 'puter';

        if (!selectedProviderId) { displayConfigStatus("Please select a Chat Provider.", "error"); return; }
        if (!isPuter && !apiKey && apiKeyInput) { // Check apiKeyInput exists
            displayConfigStatus(`Enter ${apiKeyLabel?.textContent || 'API Key'}.`, "error");
            if (apiConfigSection?.classList.contains('collapsed')) toggleApiConfig();
            apiKeyInput.focus();
            return;
         }
        if (!selectedModelId && selectedProviderId) {
            // Allow saving without a model, but maybe warn? Or select first?
            // For now, allow empty selection to be saved.
            console.warn(`Saving config for ${selectedProviderId} without a selected model.`);
        }

        if (!apiConfigurations.providers[selectedProviderId]) {
            apiConfigurations.providers[selectedProviderId] = getDefaultProviderConfig();
            // Initialize Puter models if saving it for the first time
            if (isPuter) {
                apiConfigurations.providers[selectedProviderId].knownModels = getCombinedPuterModels();
            }
        }

        apiConfigurations.selectedProvider = selectedProviderId;
        apiConfigurations.providers[selectedProviderId].apiKey = isPuter ? '' : apiKey;
        apiConfigurations.providers[selectedProviderId].selectedModel = selectedModelId || '';

        // Ensure Puter's knownModels list is up-to-date in config
        if (isPuter) {
             apiConfigurations.providers[selectedProviderId].knownModels = getCombinedPuterModels(
                 apiConfigurations.providers[selectedProviderId].knownModels
             );
             // Validate selected model against the combined list again before saving
             if (selectedModelId && !apiConfigurations.providers[selectedProviderId].knownModels.includes(selectedModelId)) {
                 console.warn(`Selected Puter model '${selectedModelId}' is invalid. Clearing selection.`);
                 apiConfigurations.providers[selectedProviderId].selectedModel = '';
                 if (modelSelect.value) modelSelect.value = ''; // Update UI
             }
        }

        try {
            localStorage.setItem('apiConfigurations', JSON.stringify(apiConfigurations));
            let successMsg = `Chat config saved for ${selectedProviderId}.`;
            const currentModel = apiConfigurations.providers[selectedProviderId]?.selectedModel;
            successMsg += currentModel ? ` Model: ${currentModel}.` : ` (No model selected).`;
            displayConfigStatus(successMsg, "success");

            const shouldCollapse = selectedProviderId && (isPuter || apiKey);
            if (shouldCollapse && apiConfigSection && !apiConfigSection.classList.contains('collapsed')) {
                apiConfigSection.classList.add('collapsed');
            }
        } catch (e) {
            console.error("Error saving API configurations to localStorage:", e);
            let errorMsg = "Error saving configuration!";
            if (e.name === 'QuotaExceededError') { errorMsg = "Error: Local storage full."; alert(errorMsg + " Clear data/chats."); }
            else { alert(errorMsg + " See console."); }
            displayConfigStatus(errorMsg, "error");
        }
    }

    // Adds a new model ID to the selected provider's list
    function handleAddModel() {
        if (!newModelInput || !providerSelect || !modelSelect || !addModelBtn) return;

        const newModelId = newModelInput.value.trim();
        const currentProviderId = providerSelect.value;

        if (!currentProviderId) { displayConfigStatus("Select Chat Provider first.", "error"); return; }
        // *** MODIFICATION: Allow adding models for Puter ***
        // if (currentProviderId === 'puter') { displayConfigStatus("Puter models fixed.", "error"); return; } // REMOVED THIS BLOCK
        if (!newModelId) { displayConfigStatus("Enter Chat Model ID to add.", "error"); return; }

        if (!apiConfigurations.providers[currentProviderId]) {
            apiConfigurations.providers[currentProviderId] = getDefaultProviderConfig();
             if (currentProviderId === 'puter') { // Initialize if adding to Puter first time
                 apiConfigurations.providers[currentProviderId].knownModels = getCombinedPuterModels();
             }
        }
        if (!Array.isArray(apiConfigurations.providers[currentProviderId].knownModels)) {
            apiConfigurations.providers[currentProviderId].knownModels = currentProviderId === 'puter' ? getCombinedPuterModels() : [];
        }
        const knownModels = apiConfigurations.providers[currentProviderId].knownModels;

        // Suggest prefix for non-Puter but don't prevent adding
        if (currentProviderId !== 'puter' && !newModelId.includes('/') && !newModelId.includes(':') && ['openrouter','fireworksai','mistralai','gemini','vertexai'].includes(currentProviderId)) {
             displayConfigStatus(`Warn: Model might need prefix. Added.`, "");
        }

        if (knownModels.includes(newModelId)) {
            displayConfigStatus(`Model "${newModelId}" already saved. Selecting.`, "");
            modelSelect.value = newModelId;
            apiConfigurations.providers[currentProviderId].selectedModel = newModelId;
            saveApiConfig(); // Save the selection change
            newModelInput.value = '';
            return;
        }

        knownModels.push(newModelId);
        knownModels.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        apiConfigurations.providers[currentProviderId].selectedModel = newModelId; // Select new model

        saveApiConfig(); // Save new list and selection (also updates status)
        populateModelDropdown(knownModels, newModelId); // Update dropdown UI
        newModelInput.value = ''; // Clear input
    }

    // Handles changing the provider dropdown selection
    function handleProviderChange() {
        if (!providerSelect) return;
        const newProviderId = providerSelect.value;
        console.log(`Provider changed to: ${newProviderId}`);
        apiConfigurations.selectedProvider = newProviderId;
        updateUiForProvider(newProviderId); // This will populate models correctly and handle UI enabling/disabling

        try { // Save the new provider selection preference
           localStorage.setItem('apiConfigurations', JSON.stringify(apiConfigurations));
        } catch (e) { console.error("Error saving provider pref:", e); displayConfigStatus("Error saving provider pref.", "error"); }

       const providerConfig = apiConfigurations.providers[newProviderId] || {};
       const isPuter = newProviderId === 'puter';
       // Expand config if not Puter and key is missing
       if (!isPuter && apiKeyInput && !(providerConfig.apiKey)) {
             if (apiConfigSection?.classList.contains('collapsed')) {
                 apiConfigSection.classList.remove('collapsed');
                 // Optionally focus the key input if provider requires it
                 // setTimeout(() => apiKeyInput.focus(), 100);
             }
       }
   }

    // Toggles the visibility of the API configuration section in controls
    function toggleApiConfig() {
        if (apiConfigSection) { apiConfigSection.classList.toggle('collapsed'); }
    }

    // Displays status messages in the API config section
    function displayConfigStatus(message, type = "") {
        if (!configStatus) return;
        configStatus.textContent = message;
        configStatus.className = `config-status ${type}`;
        const currentMessage = message; // Capture message
        setTimeout(() => { // Clear after delay
            if (configStatus.textContent === currentMessage) {
                configStatus.textContent = ""; configStatus.className = "config-status";
            }
        }, 6000);
    }


    // ========================================================================
    // Chat History Functions (with Robustness)
    // ========================================================================

    function loadChatHistory() {
        console.log("Loading chat history...");
        let savedHistory = null; chatHistory = [];
        try { savedHistory = localStorage.getItem('chatHistory'); }
        catch (e) { console.error("Error reading chat history:", e); displayMessage("Warn: Cannot load history (storage err).",'ai-message error placeholder-message'); }

        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory)) {
                     chatHistory = parsedHistory.filter(chat => // Validate structure
                         chat && typeof chat === 'object' && typeof chat.id === 'number' && Array.isArray(chat.messages) &&
                         chat.messages.every(m => m && typeof m === 'object' && typeof m.role === 'string' && (m.role === 'user' || m.role === 'ai') && typeof m.content === 'string')
                     );
                     if (chatHistory.length !== parsedHistory.length) console.warn("Filtered invalid chat sessions during load.");
                } else { console.warn("History not array. Resetting."); chatHistory = []; try { localStorage.removeItem('chatHistory'); } catch(e){/* ignore */} }
            } catch (e) { console.error("Error parsing chat history:", e); chatHistory = []; try { localStorage.removeItem('chatHistory'); } catch(e){/* ignore */} displayMessage("Warn: History corrupted, reset.",'ai-message error placeholder-message'); }
        }
        renderChatList(); // Render whatever was loaded (or empty)
        if (chatHistory.length > 0) { loadChatSession(chatHistory[0].id); } // Load most recent
        else { startNewChat(false); } // Start fresh if none
    }

    function renderChatList() {
        if (!chatListUl) return; chatListUl.innerHTML = '';
        chatHistory.sort((a, b) => b.id - a.id); // Ensure latest first

        chatHistory.forEach(chat => {
            const li = document.createElement('li'); li.dataset.chatId = chat.id;
            if (chat.id === currentChatId) li.classList.add('active-chat');
            const titleSpan = document.createElement('span'); let displayTitle = chat.title || '';
            if (!displayTitle) { const fm = chat.messages?.find(m=>m.role==='user'); if(fm?.content){ const pt = filterHtmlForApi(fm.content); displayTitle=pt.substring(0,30).trim()+(pt.length>30?'...':''); } else { displayTitle=`Chat ${new Date(chat.id).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`; } }
            titleSpan.textContent = displayTitle; titleSpan.classList.add('chat-title'); titleSpan.title = displayTitle; li.appendChild(titleSpan);
            const deleteBtn = document.createElement('button'); deleteBtn.innerHTML = ''; /* Wastebasket emoji/icon */ deleteBtn.classList.add('delete-chat-btn'); deleteBtn.setAttribute('title','Delete chat'); deleteBtn.dataset.chatId = chat.id;
            deleteBtn.addEventListener('click', e => { e.stopPropagation(); requestAnimationFrame(() => { if(confirm(`Delete chat "${displayTitle}"?`)) deleteChatSession(chat.id); }); }); li.appendChild(deleteBtn);
            li.addEventListener('click', e => { if (!deleteBtn.contains(e.target)) loadChatSession(chat.id); });
            chatListUl.appendChild(li);
        });
    }

    function deleteChatSession(chatIdToDelete) {
        const numericId = Number(chatIdToDelete);
        const index = chatHistory.findIndex(c => c.id === numericId);
        if (index > -1) {
            chatHistory.splice(index, 1); saveChatHistoryToStorage();
            if (currentChatId === numericId) { if (chatHistory.length > 0) loadChatSession(chatHistory[0].id); else startNewChat(false); }
            else { renderChatList(); }
        } else { console.warn(`Chat ID ${numericId} not found for deletion.`); renderChatList(); }
    }

    function saveChatHistoryToStorage() {
        try {
            const historyToSave = chatHistory.filter(c => c.messages?.length > 0); // Prune empty
            if (historyToSave.length !== chatHistory.length) { console.log("Pruned empty chats."); chatHistory = historyToSave; }
            localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
        } catch (e) {
            console.error("Error saving chat history:", e); let m="Warn: Cannot save history.";
            if(e.name==='QuotaExceededError'){ m="Err: Storage full."; alert(m); } else { displayMessage(m+" (See console)",'ai-message error placeholder-message'); }
        }
    }

    function saveCurrentSession() {
        if (currentChatId === null) { console.log("No current session to save."); return false; }
        const messages = getCurrentChatMessages();
        const index = chatHistory.findIndex(c => c.id === currentChatId);
        if (index === -1) { console.error(`CRIT: Cannot save session ${currentChatId}, not found.`); return false; }

        if (messages.length === 0) { // Remove if empty
            console.log(`Removing empty chat ${currentChatId}.`); chatHistory.splice(index, 1); saveChatHistoryToStorage(); renderChatList(); return false;
        } else { // Update existing
            const fm = messages.find(m=>m.role==='user'); const tt = fm ? filterHtmlForApi(fm.content) : '';
            const newTitle = tt ? tt.substring(0,35).trim()+(tt.length>35?'...':'') : chatHistory[index].title || `Chat ${new Date(currentChatId).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
            chatHistory[index].messages = messages; chatHistory[index].title = newTitle;
            // console.log(`Updated session ${currentChatId} (Title: ${newTitle})`); // Less verbose
            saveChatHistoryToStorage(); renderChatList(); return true;
        }
    }

    function getCurrentChatMessages() {
        if (!chatView) return [];
        const messageElements = chatView.querySelectorAll('.message.user-message, .message.ai-message:not(.thinking):not(.error):not(.placeholder-message)');
        const messages = [];
        messageElements.forEach(el => {
            const role = el.classList.contains('user-message') ? 'user' : 'ai';
            const contentContainer = el.querySelector('.message-content'); let content = '';
            if (contentContainer) {
                content = contentContainer.textContent || ''; // Store plain text
            } else { console.warn("No .message-content in:",el); content = (el.textContent||'').trim(); } // Fallback

            let model = null; if (role === 'ai') { const mA=el.querySelector('.model-attribution'); model = mA?mA.textContent.replace(/\(via |\)/g,'').trim():null; }
            if (content?.trim() || role === 'ai') { // Keep AI messages even if technically empty
                 const msg = { role: role, content: content };
                 if (role === 'ai' && model) msg.model = model; messages.push(msg);
            }
        });
        return messages;
    }

    function loadChatSession(chatId) {
        const numericId = Number(chatId);
        if (currentChatId !== null && currentChatId !== numericId) saveCurrentSession(); // Save previous first
        const chat = chatHistory.find(c => c.id === numericId);
        if (!chat) { console.error(`Chat ID ${numericId} not found.`); displayMessage(`Err: Cannot load chat ${numericId}. Starting new.`,'ai-message error placeholder-message'); startNewChat(false); return; }
        currentChatId = numericId; console.log(`Loading session: ${currentChatId}`);
        if(chatView) chatView.innerHTML = ''; else return; // Critical check

        if (chat.messages?.length > 0) {
            chat.messages.forEach(m => { if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') { console.warn("Skipping invalid history msg:",m); return; } displayMessage(m.content, m.role==='user'?'user-message':'ai-message', (m.role==='ai'?m.model:null)); });
        } else { displayMessage("Chat empty. Enter message.",'ai-message placeholder-message'); }

        renderChatList(); if(chatInput) chatInput.focus();
        requestAnimationFrame(()=>{if(chatView) chatView.scrollTop = chatView.scrollHeight;}); // Scroll bottom
        if (window.innerWidth <= 768) closeSidebars(); // Close sidebar on mobile
    }

    function startNewChat(savePrevious = true) {
        console.log(`Starting new chat. Save prev: ${savePrevious}`);
        if (savePrevious && currentChatId !== null) { const s=saveCurrentSession(); console.log(`Prev session (${currentChatId}) ${s?'saved':'not saved'}.`); }
        currentChatId = null; console.log("Current Chat ID null.");
        if (chatView) { chatView.innerHTML=''; displayMessage("New chat. Config & enter message...",'ai-message placeholder-message'); } else { console.error("Chat view missing."); }
        if (imageOutputArea) imageOutputArea.style.display = 'none'; // Hide image area on new chat
        if (generatedImage) generatedImage.src = '';
        if (imageStatus) imageStatus.textContent = '';

        renderChatList(); // Update list (no active chat)
        if (chatInput) { chatInput.value=''; chatInput.disabled = false; adjustTextareaHeight(chatInput); chatInput.focus(); }
        setApiCallInProgress(false, 'all'); setUploadInProgress(false); clearTemporaryMessage();
        if (window.innerWidth <= 768) closeSidebars();
    }


    // ========================================================================
    // File Upload Handling (Placeholder - Requires Backend)
    // ========================================================================
    function handleFileSelect(event) { showUploadStatus("File upload requires backend.", "error"); resetFileInput(); }
    function showUploadStatus(message, type = '') { if(!uploadStatus)return; uploadStatus.textContent=message.replace(/</g,"<").replace(/>/g,">"); uploadStatus.className=`upload-status-indicator ${type} visible`; if(type==='success'||type==='error'){const cM=message; setTimeout(()=>{if(uploadStatus.textContent===cM){uploadStatus.classList.remove('visible');}},6000);} }
    function setUploadInProgress(isUploading){ if(uploadBtn)uploadBtn.disabled=isUploading; if(generateBtn)generateBtn.disabled=isUploading || isGeneratingChat || isGeneratingImage; } // Also disable generate btn
    function resetFileInput() { if (fileInput) fileInput.value = null; }


    // ========================================================================
    // Chat Interaction & API Call (Handles Backend and Puter)
    // ========================================================================

    // Main handler for user input (Generate button or Enter key)
    async function handleUserInput() {
        if (!chatInput || !providerSelect || !modelSelect) return; // Need core elements

        const messageText = chatInput.value.trim();
        const currentProviderId = apiConfigurations.selectedProvider;
        const providerConfig = apiConfigurations.providers[currentProviderId];
        const isPuter = currentProviderId === 'puter';
        const selectedModelId = providerConfig?.selectedModel;

        // --- Validation ---
        if (!currentProviderId) { displayTemporaryMessage("Error: No Chat Provider selected.", "e"); if (apiConfigSection?.classList.contains('collapsed')) toggleApiConfig(); providerSelect.focus(); return; }
        if (!isPuter && (!providerConfig || !providerConfig.apiKey)) { displayTemporaryMessage(`Error: API Key missing for ${currentProviderId}.`, "e"); if (apiConfigSection?.classList.contains('collapsed')) toggleApiConfig(); apiKeyInput.focus(); return; }
        if (!selectedModelId) { displayTemporaryMessage(`Error: No Chat Model selected for ${currentProviderId}.`, "e"); if (apiConfigSection?.classList.contains('collapsed')) toggleApiConfig(); (modelSelect.options.length > 1 ? modelSelect : newModelInput).focus(); return; }
        if (!messageText) { console.log("Empty message attempt."); chatInput.focus(); return; }

        clearTemporaryMessage();
        if (imageOutputArea) imageOutputArea.style.display = 'none'; // Hide image if sending chat

        // --- Session Management ---
        let chatToUpdate;
        if (currentChatId === null) { // Start new session
            currentChatId = Date.now(); const titleText = filterHtmlForApi(messageText);
            const title = titleText.substring(0,35).trim() + (titleText.length>35?'...':'') || `Chat ${new Date(currentChatId).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
            const newChat = { id: currentChatId, title: title, messages: [] }; chatHistory.unshift(newChat); chatToUpdate = newChat;
            console.log(`New session: ${currentChatId}`); renderChatList();
            const placeholder = chatView?.querySelector('.placeholder-message'); if (placeholder) placeholder.remove();
        } else { // Add to existing
            chatToUpdate = chatHistory.find(c => c.id === currentChatId);
            if (!chatToUpdate) { console.error(`CRIT: Chat ${currentChatId} not found! Starting new.`); displayTemporaryMessage("Err: Session lost. New chat.", "e"); startNewChat(false); chatInput.value = messageText; handleUserInput(); return; }
            if (!Array.isArray(chatToUpdate.messages)) chatToUpdate.messages = []; // Safety check
        }

        // --- Display User Msg & Update State ---
        const userMessageObj = { role: 'user', content: messageText }; // Store plain text
        displayMessage(messageText, 'user-message'); // Display (will handle linkification etc.)
        chatToUpdate.messages.push(userMessageObj); // Save plain text to history
        chatInput.value = ''; adjustTextareaHeight(chatInput);
        saveCurrentSession(); // Save state (including user msg)

        // --- Branch: Call Puter or Backend ---
        setApiCallInProgress(true, 'chat'); // Disable chat inputs

        if (isPuter) {
            // --- PUTER API CALL (Frontend) ---
            const puterModel = selectedModelId; // Use selected Puter model (could be default or user-added)
            console.log(`Calling Puter Chat: ${puterModel}`);
            displayTemporaryMessage("Thinking (Puter Chat)...", "t");
            try {
                 if (typeof puter === 'undefined' || !puter.ai?.chat) throw new Error("Puter.js missing/not initialized.");

                 // Prepare message history for Puter (last ~10 messages, map roles)
                 const historyForPuter = chatToUpdate.messages.map(m => ({
                     role: m.role === 'ai' ? 'assistant' : 'user', // Map 'ai' to 'assistant'
                     content: m.content // Use stored plain text
                 })).slice(-10); // Limit history context

                 console.log("Puter history:", historyForPuter);
                 const puterResponse = await puter.ai.chat(historyForPuter, { model: puterModel });
                 clearTemporaryMessage();

                if (puterResponse?.message?.content) {
                    saveAndDisplayResponse(puterResponse.message.content.trim(), `Puter/${puterModel}`);
                }
                 else if (puterResponse && !puterResponse.message?.content) {
                     // Handle cases where Puter might return an empty response or structure differs
                     console.warn("Puter response received but content is missing:", puterResponse);
                     throw new Error("Puter returned an empty or unexpected response.");
                 } else {
                     throw new Error("Puter response was invalid or empty.");
                 }
            } catch (error) {
                clearTemporaryMessage(); console.error("Puter Chat Call Fail:", error);
                let eD = error.message || "Unknown Puter error";
                 // Try to get more specific error details if available
                if (error.response?.data?.error?.message) eD = error.response.data.error.message;
                else if (error.details) eD = error.details; // Puter.js might throw error objects with details
                else if (typeof error === 'string') eD = error;
                displayMessage(`API Err (Puter Chat): ${eD}`, "e");
            } finally {
                setApiCallInProgress(false, 'chat');
                if (chatInput && !chatInput.disabled) setTimeout(() => chatInput.focus(), 0);
            }
        } else {
            // --- BACKEND API CALL ---
            // Pass the API key from the validated config to the backend
            callBackendApiFunction(selectedModelId, currentProviderId, chatToUpdate.messages, providerConfig.apiKey);
            // callBackendApiFunction handles its own setApiCallInProgress(false) in finally block
        }
    }

    // --- ADDED: Text-to-Image Handler ---
    async function handleGenerateImage() {
        if (!chatInput || isGeneratingImage || isGeneratingChat) return; // Need input, prevent overlap

        const prompt = chatInput.value.trim();
        if (!prompt) {
            displayTemporaryMessage("Enter image prompt in input box.", "e");
            return;
        }

        if (typeof puter === 'undefined' || !puter.ai?.txt2img) {
             displayMessage("Error: Puter.js (txt2img) not loaded/available.", "e");
             return;
        }

        console.log("Generating Image with Puter...");
        setApiCallInProgress(true, 'image'); // Disable image button and potentially input
        displayTemporaryMessage("Generating image with Puter...", "t");
        if (imageOutputArea) imageOutputArea.style.display = 'none'; // Hide previous
        if (generatedImage) generatedImage.src = '';
        if (imageStatus) imageStatus.textContent = 'Processing...';

        try {
            // Call Puter Text-to-Image
            const imageResult = await puter.ai.txt2img(prompt); // Expects <img> element or data URL

            clearTemporaryMessage();
            // Puter v2 returns an <img> element directly
            if (imageResult && imageResult.tagName === 'IMG' && imageResult.src) {
                const imageUrl = imageResult.src; // Get the data URL from the generated <img>
                console.log("Image generated successfully.");
                 if (generatedImage) generatedImage.src = imageUrl;
                 if (imageStatus) imageStatus.textContent = `Prompt: ${prompt}`;
                 if (imageOutputArea) imageOutputArea.style.display = 'block';
                requestAnimationFrame(() => { imageOutputArea.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
            } else {
                 console.error("Puter txt2img response invalid:", imageResult);
                 throw new Error("Puter txt2img response was not a valid image element.");
            }
        } catch (error) {
            clearTemporaryMessage();
            console.error("Puter Text-to-Image Fail:", error);
            let eD = error.message || "Unknown Puter txt2img error";
             if (error.details) eD = error.details;
            displayMessage(`Image Gen Err (Puter): ${eD}`, "e");
            if (imageStatus) imageStatus.textContent = `Error: ${eD}`;
            if (imageOutputArea) imageOutputArea.style.display = 'block'; // Show error status
        } finally {
            setApiCallInProgress(false, 'image'); // Re-enable buttons/input
        }
    }

    // --- ADDED: Text-to-Speech Handler ---
    async function handleTextToSpeech(textToSpeak, buttonElement) {
        if (!textToSpeak || isPlayingSpeech || !buttonElement) return;

        if (typeof puter === 'undefined' || !puter.ai?.txt2speech) {
            console.error("Puter.js (txt2speech) not loaded.");
            buttonElement.textContent = 'Err'; buttonElement.disabled = true;
             setTimeout(() => { buttonElement.textContent = '🔊'; buttonElement.disabled = false; }, 2000);
            return;
        }

        console.log("Synthesizing Speech with Puter...");
        const originalText = buttonElement.textContent;
        buttonElement.textContent = '⏳'; // Loading indicator
        buttonElement.disabled = true;
        isPlayingSpeech = true;

        try {
            // Call Puter Text-to-Speech
            const audio = await puter.ai.txt2speech(textToSpeak); // Returns an Audio object

            console.log("Speech synthesized. Playing...");
            buttonElement.textContent = '▶️'; // Playing indicator

            audio.addEventListener('ended', () => {
                console.log("Speech finished playing.");
                buttonElement.textContent = originalText; // Restore original icon
                buttonElement.disabled = false;
                isPlayingSpeech = false;
            });
            audio.addEventListener('error', (e) => {
                console.error("Audio playback error:", e);
                throw new Error("Audio playback failed."); // Propagate to catch block
            });

            audio.play();

        } catch (error) {
            console.error("Puter Text-to-Speech Fail:", error);
            let eD = error.message || "Unknown Puter txt2speech error";
            if (error.details) eD = error.details;
             buttonElement.textContent = '❌'; // Error indicator
             setTimeout(() => {
                 buttonElement.textContent = originalText;
                 buttonElement.disabled = false;
                 isPlayingSpeech = false;
             }, 2500);
        }
    }


    // Function to add copy-to-clipboard functionality
    function addCopyFunctionality(button, contentToCopy, feedbackText = "Copied!") {
        if (!button) return;
        button.addEventListener('click', async () => {
            const originalText = button.textContent; const plainText = contentToCopy || "";
            if (!plainText || !navigator.clipboard) { console.warn("Copy failed: No content or clipboard unsupported."); button.textContent = 'N/A'; setTimeout(()=>{button.textContent=originalText;},1500); return; }
            try {
                await navigator.clipboard.writeText(plainText); button.textContent = feedbackText; button.disabled = true;
                console.log('Content copied'); setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 1500);
            } catch (err) {
                console.error('Copy Fail:', err); button.textContent = 'Error'; button.disabled = true;
                if (err.name === 'NotAllowedError' || err.message.includes('secure context')) alert("Copy fail. Need HTTPS/localhost.");
                else alert("Cannot copy text. See console.");
                setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2500);
            }
        });
    }

    // Displays message in chat view, handles Markdown, adds copy/speak buttons
    function displayMessage(content, className, modelName = null) {
        if (!chatView) return null;
        const isTemporary = className.includes('placeholder')||className.includes('thinking')||className.includes('error');
        if (!isTemporary) clearTemporaryMessage();

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', ...(className.split(' ')));
        const isAiMessage = className.includes('ai-message') && !isTemporary;
        const isUserMessage = className.includes('user-message');

        // --- Message Controls Container ---
        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('message-controls'); // Added class for styling
        messageElement.appendChild(controlsDiv);

        // --- ADDED: Text-to-Speech Button ---
        let speakBtn = null;
        if (isAiMessage && typeof puter !== 'undefined' && puter.ai?.txt2speech) { // Only add if Puter TTS is available
            speakBtn = document.createElement('button');
            speakBtn.textContent = '🔊'; // Speaker icon
            speakBtn.classList.add('message-action-btn', 'speak-btn');
            speakBtn.title = 'Speak this message (Uses Puter)';
            controlsDiv.appendChild(speakBtn); // Add to controls container
        }

        // --- Copy Button ---
        if (!className.includes('placeholder') && !className.includes('thinking') && navigator.clipboard) { // Only add if copy possible
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋'; // Clipboard icon
            copyBtn.classList.add('message-action-btn', 'copy-btn');
            copyBtn.title = 'Copy text';
            controlsDiv.appendChild(copyBtn); // Add to controls container
        }

        // Add Model Attribution
        if (isAiMessage && modelName) {
            const mA = document.createElement('div'); mA.classList.add('model-attribution');
            // Sanitize modelName carefully before displaying
            mA.textContent = `(via ${modelName.replace(/[<>]/g, '')})`; // Basic sanitization
            messageElement.appendChild(mA); // Appends before content div
        }

        // Create Content Container
        const contentContainer = document.createElement('div'); contentContainer.classList.add('message-content');

        // Render Content
        if (isAiMessage) { // Render AI messages as Markdown
            if (typeof marked === 'function') {
                try {
                    // Basic sanitization before Markdown parsing
                    // Note: marked's sanitize option is deprecated. Rely on careful rendering.
                    const sanitizedContent = content; // Add more robust sanitization if needed here
                    marked.setOptions({ gfm: true, breaks: true, mangle: false, headerIds: false });
                    contentContainer.innerHTML = marked.parse(sanitizedContent);
                 }
                catch (e) { console.error("Markdown err:", e); contentContainer.textContent = content; contentContainer.style.whiteSpace = 'pre-wrap'; }
            } else { contentContainer.textContent = content; contentContainer.style.whiteSpace = 'pre-wrap'; if (!window.mKW) console.warn("marked.js missing"); window.mKW = true; }
        } else { // Linkify user messages / other non-markdown content
             // More robust link detection and basic HTML tag removal
             const urlRegex = /((?:https?:\/\/|www\.)[^\s"'<>{}|\\^`[\]]+)/g; // Improved regex
             const simpleTagRegex = /<[^>]*>/g; // Strip all HTML tags for non-markdown
             const preProcessedContent = content.replace(simpleTagRegex, ''); // Remove tags first
             contentContainer.innerHTML = preProcessedContent.replace(urlRegex, (match) => {
                 let href = match.startsWith('www.') ? 'http://' + match : match;
                 return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
             });
             contentContainer.style.whiteSpace = 'pre-wrap';
        }
        messageElement.appendChild(contentContainer); // Appends after model attribution

        // --- Attach Button Functionality ---
        const textContentToUse = contentContainer.textContent || ''; // Use textContent AFTER rendering
        const copyButton = messageElement.querySelector('.copy-btn');
        if (copyButton) addCopyFunctionality(copyButton, textContentToUse);
        if (speakBtn) { // Attach speak handler if button exists
            speakBtn.addEventListener('click', () => handleTextToSpeech(textContentToUse, speakBtn));
        }


        chatView.appendChild(messageElement); // Add to DOM
        requestAnimationFrame(() => { chatView.scrollTo({ top: chatView.scrollHeight, behavior: 'smooth' }); }); // Scroll
        if (isTemporary) { clearTemporaryMessage(); temporaryAiMessageElement = messageElement; } // Store temp ref
        return messageElement;
    }

    // Helper to display temporary messages (Thinking/Error/Placeholder)
    function displayTemporaryMessage(content, typeChar = "p") { // e=error, t=thinking, p=placeholder
        clearTemporaryMessage();
        const className = typeChar === 'e' ? 'ai-message error' : (typeChar === 't' ? 'ai-message thinking' : 'ai-message placeholder-message');
        temporaryAiMessageElement = displayMessage(content, className);
    }

    // Helper to remove the current temporary message
    function clearTemporaryMessage() {
        if (temporaryAiMessageElement?.parentNode === chatView) {
            try { chatView.removeChild(temporaryAiMessageElement); } catch(e) { console.warn("Minor issue removing temp msg:", e);}
        }
        temporaryAiMessageElement = null;
    }

    // Calls the backend serverless function for non-Puter providers
    async function callBackendApiFunction(modelId, providerId, history=[], apiKey) { // Pass API key
        console.log(`Calling Backend: ${providerId}/${modelId}`);
        displayTemporaryMessage("Thinking...", "t");

        // Ensure history uses plain text content
        const historyForBackend = history.map(m => ({ role: m.role, content: m.content || '' }));

        // Gather settings from UI
        const settings = { lang: getElement('language-select')?.value||'', mode: getElement('writing-mode-select')?.value||'', tone: getElement('primary-tone-select')?.value||'', form: getElement('formality-level')?.value||'', event: getElement('speech-event-select')?.value||'', audP: getElement('primary-audience-select')?.value||'', audS: getElement('secondary-audience-select')?.value||'', core: getElement('core-message')?.value||'', cta: getElement('call-to-action')?.value||'', val: getElement('enhance-school-values')?.checked||!1, ach: getElement('enhance-achievements')?.checked||!1, sen: getElement('enhance-sensory')?.checked||!1, dia: getElement('enhance-dialogue')?.checked||!1, gen: generalToggle?generalToggle.checked:!1, str: structuredOutputToggle?structuredOutputToggle.checked:!1 };
        const systemPrompt = constructSystemPrompt(settings);
        const standardMessages = prepareStandardMessagesForBackend(historyForBackend); // Use plain text history

        try {
            const response = await fetch(GENERATE_API_ENDPOINT,{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    // Optionally include API key in headers if needed (e.g., 'Authorization')
                    // Be cautious about sending keys directly in headers from the frontend if possible.
                    // The backend should ideally fetch the key from environment variables.
                    // If the backend NEEDS the key in the request, uncomment and adjust:
                    // 'X-Api-Key': apiKey // Custom header example
                },
                body:JSON.stringify({
                    providerId,
                    modelId,
                    messages: standardMessages,
                    systemPrompt,
                    apiKey // Send API key in the body for backend to use
                })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const textResponse = await response.text();
                throw new Error(`Backend non-JSON response (${response.status}): ${textResponse.substring(0, 200)}`);
            }

            clearTemporaryMessage();

            if (!response.ok) { // Handle backend/API errors
                 const errInfo = data?.error || data?.detail || data;
                 // Try to get a nested message if present
                 let errMsg = (typeof errInfo === 'object' && errInfo !== null && errInfo.message)
                               ? errInfo.message
                               : (typeof errInfo === 'string' ? errInfo : `Backend Error: ${response.status} ${response.statusText||'Unknown'}`);

                 // Add provider-specific error details if available
                 if (errInfo && errInfo.code) errMsg += ` (Code: ${errInfo.code})`;
                 if (errInfo && errInfo.type) errMsg += ` (Type: ${errInfo.type})`; // Anthropic

                 console.error(`Backend Err (${response.status}):`,errMsg,"\nRsp:",data); displayMessage(`API Error: ${errMsg}`,"e");
            } else { // Success, parse provider response
                const { responseText:rT, actualModelUsed:aM, errorMsg:pE } = parseProviderResponse(providerId, data);
                if (pE) { console.error(`AI Rsp Err (${providerId}):`,pE,"\nData:",data); displayMessage(`API Rsp Err: ${pE}`,"e"); }
                else if (!rT && providerId !== 'anthropic') { // Anthropic might end turn with no text
                    console.warn(`AI empty content (${providerId}). Data:`,data);
                    // Gemini empty response reasons
                    if (providerId==='gemini' && data?.candidates?.[0]?.finishReason && data.candidates[0].finishReason !=='STOP'){ displayMessage(`AI empty/incomplete (Reason: ${data?.candidates?.[0]?.finishReason||'?'}).`,"e"); }
                    // Vertex empty response reasons
                    else if (providerId==='vertexai' && data?.predictions?.[0]?.safetyAttributes?.blocked) { displayMessage(`AI response blocked by safety filters.`,"e"); }
                    else if (providerId!=='gemini') { displayMessage(`AI empty rsp. (Model: ${aM||modelId})`,"e"); }
                    else { console.log("Provider finished STOP with no text content."); } // Possibly filtered or just done
                }
                else if (rT || (providerId === 'anthropic' && data?.stop_reason === 'end_turn')) { saveAndDisplayResponse(rT, aM || modelId); }
                else { console.warn(`AI rsp empty unexpectedly (${providerId}). Data:`,data); displayMessage(`Unexpected empty rsp.`,"e"); } // Fallback error
            }
        } catch (error) { // Handle network errors to *our* backend
            console.error(`Backend Fetch Fail:`, error); clearTemporaryMessage(); displayMessage(`Err: Cannot connect backend. ${error.message||''}`,"e");
        } finally { // Ensure input is re-enabled
            setApiCallInProgress(false, 'chat'); if (chatInput && !chatInput.disabled) setTimeout(() => chatInput.focus(), 0);
        }
    }

    // Prepares message history in standard format for backend consumption
    function prepareStandardMessagesForBackend(fullHistory = []) {
        const historyLimitPairs = 10; // Max history turns (user + ai = 1 turn)
        const messages = (Array.isArray(fullHistory)?fullHistory:[])
            .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string' && (m.role==='user'||m.role==='ai')) // Basic validation
            .slice(-(historyLimitPairs * 2)) // Take last N messages
            .map(m => ({ role: m.role, content: m.content.trim() })) // Use plain text, trim
            .filter(m => m.content); // Ensure content isn't just whitespace after trim
        // console.log(`Std Msgs for Backend (${messages.length}):`, JSON.stringify(messages).substring(0,300)+"..."); // Less verbose
        return messages;
    }

    // Parses the raw JSON response *from our backend* (containing provider's response)
    function parseProviderResponse(providerId, d) { // d = data
        let rT="", aM=null, eM=null; // responseText, actualModel, errorMsg
        try {
            // Check for top-level error passed through by our backend *first*
            if (d?.error) {
                 eM = (typeof d.error === 'object' && d.error !== null && d.error.message) ? d.error.message : (typeof d.error === 'string' ? d.error : JSON.stringify(d.error));
                 console.warn(`Error field in response data for ${providerId}:`, eM);
                 return { responseText: '', actualModelUsed: null, errorMsg: eM };
            }

            // --- Provider-Specific Parsing ---
            switch (providerId) {
                case 'openrouter': case 'fireworksai': case 'mistralai':
                    rT = d?.choices?.[0]?.message?.content?.trim() || ""; aM = d?.model || null;
                    const fO = d?.choices?.[0]?.finish_reason; if(fO && fO !== 'stop') { console.warn(`OpenAI-like finish: ${fO}`); if (fO === 'length' || fO === 'max_tokens') rT += "\n\n*(Truncated)*"; else if (fO === 'content_filter') eM = "Stopped by content filter."; }
                    break;

                case 'gemini':
                    if (d.promptFeedback?.blockReason) { eM = `Blocked by safety filters: ${d.promptFeedback.blockReason}`; }
                    else {
                        rT = d?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim() || ""; // Join parts if multiple
                        aM = `google/${apiConfigurations.providers[providerId]?.selectedModel || modelSelect?.value || '?'}`;
                        const fG = d?.candidates?.[0]?.finishReason;
                        if (fG && fG !== "STOP") { console.warn(`Gemini finish: ${fG}`); if (fG === "SAFETY") eM = "Stopped by safety settings."; else if (fG === "MAX_TOKENS") rT += "\n\n*(Truncated)*"; else if (!rT) eM = `Stopped unexpectedly: ${fG}`; }
                        if (fG === "STOP" && !rT && d?.candidates?.[0]?.content === undefined) { console.warn("Gemini STOP no content, possible filter."); }
                    }
                    break;

                case 'anthropic':
                     // Anthropic uses 'content' block array
                     if (d?.content?.length > 0) {
                         rT = d.content.filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
                     } else if (d?.stop_reason === 'error') { console.warn("Anthropic error stop:", d); eM = "Anthropic generation error."; } else { console.warn("Anthropic no text content:", d); rT = ""; }
                     aM = d?.model || null;
                     const fA = d?.stop_reason; if (fA && fA !== 'end_turn' && fA !== 'stop_sequence') { console.warn(`Anthropic finish: ${fA}`); if (fA === 'max_tokens') rT += "\n\n*(Truncated)*"; else if (fA === 'error' && !eM) eM = "Anthropic stopped due to error."; }
                    break;

                 case 'vertexai':
                     // Vertex AI response structure (example for chat models)
                     if (d?.predictions?.[0]?.safetyAttributes?.blocked) { eM = `Blocked by Vertex safety filters.`; }
                     else {
                         // Check common structures
                         rT = d?.predictions?.[0]?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim() || // Newer structure?
                               d?.predictions?.[0]?.content?.trim() || // Simpler structure?
                               "";
                         aM = `vertex/${apiConfigurations.providers[providerId]?.selectedModel || modelSelect?.value || '?'}`;
                          // Check finish reason if available (structure might vary)
                         const fV = d?.predictions?.[0]?.candidates?.[0]?.finishReason || d?.predictions?.[0]?.finishReason;
                         if (fV && fV !== "STOP" && fV !== "FINISH_REASON_UNSPECIFIED") { console.warn(`Vertex finish: ${fV}`); if (fV === "SAFETY") eM = "Stopped by safety settings."; else if (fV === "MAX_TOKENS" || fV === "LENGTH") rT += "\n\n*(Truncated)*"; else if (!rT) eM = `Stopped unexpectedly: ${fV}`; }
                     }
                     break;

                 case 'cohere':
                     // Cohere v1 chat response structure
                     if (d?.chat_history && d.chat_history.length > 0) {
                         // Get the last message from the assistant
                         const lastAiMessage = d.chat_history[d.chat_history.length - 1];
                         if (lastAiMessage.role?.toUpperCase() === 'CHATBOT' || lastAiMessage.role?.toUpperCase() === 'ASSISTANT') { // CHATBOT is common role name
                             rT = lastAiMessage.message?.trim() || "";
                         }
                     }
                     // Fallback check for direct 'text' field if structure differs
                     if (!rT && d?.text) { rT = d.text.trim(); }
                      // Check for finish reason
                     const fC = d?.finish_reason; if(fC && fC !== 'COMPLETE' && fC !== 'STOP_SEQUENCE') { console.warn(`Cohere finish: ${fC}`); if (fC === 'MAX_TOKENS') rT += "\n\n*(Truncated)*"; else if (fC === 'ERROR_TOXIC') eM = "Stopped by toxicity filter."; else eM = `Stopped: ${fC}`; }
                     aM = d?.meta?.api_version?.model || 'cohere'; // Model might be in meta
                     break;

                default: // Fallback for unhandled providers
                    console.warn(`Parsing not implemented for ${providerId}. Generic attempt...`);
                    rT = d?.choices?.[0]?.message?.content?.trim() || // OpenAI like
                          d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || // Gemini like
                          d?.content?.[0]?.text?.trim() || // Anthropic like
                          d?.text?.trim() || // Simple text
                          d?.predictions?.[0]?.content?.trim() || // Vertex like
                          '';
                    if (!rT && typeof d === 'object' && d !== null) { console.warn("Generic parse failed."); eM = `Cannot parse content: ${JSON.stringify(d).substring(0,100)}...`; }
                    aM = d?.model || providerId;
                    break;
            }
        } catch (e) { eM = `JS Error parsing response structure.`; console.error(`Parse Err (${providerId}):`, e, "\nData:", d); rT = ''; }
        return { responseText: rT, actualModelUsed: aM, errorMsg: eM };
    }

    // Saves AI response to history and displays it
    function saveAndDisplayResponse(text, modelName) {
        if (currentChatId === null) { displayMessage(`Internal Err: No active chat.\n\n${text}`, "e", modelName); return; } // Critical check
        const aiMessageObj = { role: 'ai', content: text, model: modelName }; // Store plain text
        const index = chatHistory.findIndex(c => c.id === currentChatId);
        if (index > -1) {
            if (!Array.isArray(chatHistory[index].messages)) chatHistory[index].messages = [];
            chatHistory[index].messages.push(aiMessageObj);
            saveCurrentSession(); // Save updated history (already includes plain text)
        } else { console.error("CRIT: Cannot find chat",currentChatId,"to save response."); displayMessage(`Warn: Cannot save response.\n\n${text}`, "e", modelName); return; }
        displayMessage(text, 'ai-message', modelName); // Display (will render Markdown etc.)
    }

    // Locks/unlocks input elements during API calls
    function setApiCallInProgress(isCalling, type = 'all') {
        isGeneratingChat = (type === 'chat' || type === 'all') ? isCalling : isGeneratingChat;
        isGeneratingImage = (type === 'image' || type === 'all') ? isCalling : isGeneratingImage;

        const anyGenerationInProgress = isGeneratingChat || isGeneratingImage;

        if (generateBtn) generateBtn.disabled = anyGenerationInProgress;
        if (generateImageBtn) generateImageBtn.disabled = anyGenerationInProgress;
        if (chatInput) {
             chatInput.disabled = anyGenerationInProgress;
             chatInput.style.opacity = anyGenerationInProgress ? 0.6 : 1; // Visual cue
             // Change placeholder based on what's happening
            if (isGeneratingImage) {
                 chatInput.placeholder = "Generating image...";
            } else if (isGeneratingChat) {
                 chatInput.placeholder = "Generating chat response...";
             } else {
                 chatInput.placeholder = "Enter message for chat, or prompt for image...";
             }
        }
        if (uploadBtn) uploadBtn.disabled = anyGenerationInProgress; // Also disable upload
    }

    // Cleans HTML content for API/storage (basic text extraction)
    function filterHtmlForApi(htmlContent) {
        if (typeof htmlContent !== 'string') return '';
        try {
            // More robust: Use DOMParser for potentially malformed HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            // Extract text content, preserving basic line breaks from block elements
            let text = '';
            const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
            let node;
            while(node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.nodeName.toLowerCase();
                    // Add newlines for block elements
                    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'br'].includes(tagName)) {
                         // Add newline only if the last character isn't already a newline
                         if (text.length > 0 && !/\n\s*$/.test(text)) {
                             text += '\n';
                         }
                    }
                     // Add space for inline elements that might run together if not needed
                     // else if (['a', 'span', 'strong', 'em', 'i', 'b', 'code'].includes(tagName)) {
                     //    if (text.length > 0 && !/\s$/.test(text)) text += ' ';
                     // }
                }
            }
            // Cleanup whitespace
            text = text.replace(/(\r\n|\r|\n){3,}/g, '\n\n'); // Max 2 consecutive newlines
            text = text.replace(/[ \t]+/g, ' '); // Collapse multiple spaces/tabs to one space
            text = text.replace(/ +\n/g, '\n'); // Trim spaces before newlines
            text = text.replace(/\n +/g, '\n'); // Trim spaces after newlines
            return text.trim();
        } catch (e) {
            console.error("FilterHTML Error:", e);
             // Fallback: Strip tags and normalize whitespace
             return htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }

    // Constructs the system prompt based on UI settings
    function constructSystemPrompt(settings) {
        // Base prompt can be adjusted
        let prompt = `You are an AI assistant named Creative Quill. Your goal is to provide helpful, creative, and contextually appropriate responses based on the user's input and the provided configuration settings.`;

        prompt += `\n\n**Output Format & Style:**`;
        prompt += `\n* Language: ${settings.lang || 'User Default (likely English)'}`;
        prompt += `\n* Writing Mode: ${settings.mode || 'General Chat'}`;
        if (settings.tone) prompt += `\n* Primary Tone: ${settings.tone}`;
        if (settings.form) prompt += `\n* Formality Level: ${settings.form}`;
        prompt += `\n* Use Structured Output (Markdown): ${settings.str ? 'Yes' : 'No'}`;

        // Check if any speech/context-specific fields are filled or specific modes selected
        const speechModes = ['speech', 'message-announcement', 'letter-official'];
        const hasSpecificContext = settings.event || settings.audP || settings.core?.trim() || settings.cta?.trim();
        const needsContextSection = speechModes.includes(settings.mode) || hasSpecificContext;

        if (needsContextSection) {
            prompt += `\n\n**Specific Context/Task:**`;
            if (settings.mode && speechModes.includes(settings.mode)) prompt += `\n* Task Type: ${settings.mode}`;
            if (settings.event) prompt += `\n* Event/Occasion: ${settings.event}`;
            if (settings.audP) prompt += `\n* Primary Audience: ${settings.audP}`;
            if (settings.audS) prompt += `\n* Secondary Audience: ${settings.audS}`;
            if (settings.core?.trim()) prompt += `\n* Core Message/Objective: ${settings.core.trim()}`;
            if (settings.cta?.trim()) prompt += `\n* Desired Outcome/Call to Action: ${settings.cta.trim()}`;
        }

        // Determine applicable enhancements
        let enhancements = [];
        const isSchoolContext = needsContextSection && (settings.audP?.includes('student') || settings.audP?.includes('teacher') || settings.audP?.includes('parent'));
        const isGeneralCreativeContext = settings.gen;
        const generalCreativeModes = ['story', 'poem', 'letter-personal', 'article-blog', 'script-outline', 'brainstorming'];
        const dialogueModes = ['story', 'script-outline', 'letter-personal']; // Modes where dialogue makes sense

        if (settings.val && isSchoolContext) enhancements.push("Incorporate school motto/values if relevant.");
        if (settings.ach && isSchoolContext) enhancements.push("Mention school achievements/data if relevant and provided in history/prompt.");
        if (settings.sen && isGeneralCreativeContext && generalCreativeModes.includes(settings.mode)) enhancements.push("Use vivid sensory details appropriate to the mode.");
        if (settings.dia && isGeneralCreativeContext && dialogueModes.includes(settings.mode)) enhancements.push("Include natural-sounding dialogue where appropriate.");

        if (enhancements.length > 0) {
            prompt += "\n\n**Enhancement Preferences:**\n* " + enhancements.join("\n* ");
        }

        prompt += `\n\n---\nInstructions: Respond to the user's latest message. Consider the conversation history and all configuration settings above. Adhere strictly to the requested format, tone, and context. Avoid unnecessary preamble or self-introduction unless explicitly asked.`;
        // console.log("System Prompt:", prompt); // Log full prompt for debugging if needed
        return prompt;
    }

    // Adjusts textarea height dynamically
    function adjustTextareaHeight(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto'; // Temporarily shrink
        let scrollHeight = textarea.scrollHeight;
        scrollHeight += 2; // Buffer
        let maxHeight = parseInt(window.getComputedStyle(textarea).maxHeight, 10);
        if (isNaN(maxHeight) || maxHeight <= 0) maxHeight = 180; // Default max height
        if (scrollHeight > maxHeight) { textarea.style.height = maxHeight + 'px'; textarea.style.overflowY = 'auto'; }
        else { textarea.style.height = scrollHeight + 'px'; textarea.style.overflowY = 'hidden'; }
    }

    // ========================================================================
    // Initialization Function (Called at the end)
    // ========================================================================
    function runInitialization() {
        console.log("Running Full Initialization Sequence (v4)...");

        // Load State (Error handling inside)
        loadApiConfig(); // Loads config, calls updateUiForProvider
        loadChatHistory(); // Loads history, loads first chat or starts new

        // Attach remaining listeners (Check if elements exist before attaching)
        console.log("Attaching remaining listeners...");
        if (providerSelect) providerSelect.addEventListener('change', handleProviderChange); else console.error("Listener Fail: providerSelect");
        if (saveApiConfigBtn) saveApiConfigBtn.addEventListener('click', saveApiConfig); else console.error("Listener Fail: saveApiConfigBtn");
        if (apiConfigToggleBtn) { apiConfigToggleBtn.addEventListener('click', toggleApiConfig); apiConfigToggleBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleApiConfig(); }}); } else console.error("Listener Fail: apiConfigToggleBtn");
        if (addModelBtn) addModelBtn.addEventListener('click', handleAddModel); else console.error("Listener Fail: addModelBtn");
        if (newModelInput) newModelInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !addModelBtn?.disabled) { e.preventDefault(); handleAddModel(); } }); else console.error("Listener Fail: newModelInput");
        if (modelSelect) modelSelect.addEventListener('change', () => { if(providerSelect){ const cid = providerSelect.value; const sm = modelSelect.value; if (cid && apiConfigurations.providers[cid]) { apiConfigurations.providers[cid].selectedModel = sm || ''; console.log(`Model selected: ${sm || 'None'}. Saving...`); saveApiConfig(); } } }); else console.error("Listener Fail: modelSelect");
        if (generalToggle && controlsContent) { const tG = () => controlsContent.classList.toggle('show-general', generalToggle.checked); generalToggle.addEventListener('change', tG); tG(); } else {console.warn("Listener/Element Warn: generalToggle or controlsContent");}
        if (writingModeSelect && speechFocusControls) { const tS = () => { const m = writingModeSelect.value; const sS = ['speech', 'message-announcement', 'letter-official'].includes(m); speechFocusControls.style.display = sS ? 'block' : 'none'; }; writingModeSelect.addEventListener('change', tS); tS(); } else {console.warn("Listener/Element Warn: writingModeSelect or speechFocusControls");}

        // Chat Input Listener
        if (generateBtn) generateBtn.addEventListener('click', handleUserInput); else console.error("Listener Fail: generateBtn");
        if (chatInput) {
             chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey && !generateBtn?.disabled) { e.preventDefault(); handleUserInput(); } });
             chatInput.addEventListener('input', () => adjustTextareaHeight(chatInput)); window.addEventListener('resize', () => adjustTextareaHeight(chatInput)); adjustTextareaHeight(chatInput);
             chatInput.placeholder = "Enter message for chat, or prompt for image..."; // Set initial placeholder
         } else console.error("Listener Fail: chatInput");

        // Image Generation Listener
        if (generateImageBtn) generateImageBtn.addEventListener('click', handleGenerateImage); else console.error("Listener Fail: generateImageBtn");

        // New Chat Button
        if (newChatBtn) newChatBtn.addEventListener('click', () => startNewChat(true)); else console.error("Listener Fail: newChatBtn");

        // File Upload Listener (Conditional)
        if (uploadBtn && fileInput) { uploadBtn.addEventListener('click', handleFileSelect); } else { if(uploadBtn) { uploadBtn.disabled = true; uploadBtn.title = "Upload N/A"; uploadBtn.style.opacity = '0.5'; } console.warn("Upload feature not fully available."); }

        // Final visual state setup (redundant if updateUi/event listeners cover it, but safe)
        if (generalToggle && controlsContent) controlsContent.classList.toggle('show-general', generalToggle.checked);
        if (writingModeSelect && speechFocusControls) { const showSpeech = ['speech','message-announcement','letter-official'].includes(writingModeSelect.value); speechFocusControls.style.display = showSpeech ? 'block' : 'none'; }
        handleMobileOverlay(); // Ensure overlay is correct on init

        console.log("Creative Quill Studio Initialization COMPLETE.");
    } // End runInitialization

    // --- Start the Application ---
    runInitialization();

}); // End DOMContentLoaded
