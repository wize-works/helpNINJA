// public/widget/v1/client.js
function mountChatWidget(payload) {
    const {
        baseOrigin, // e.g. https://helpninja.app
        tenantId,
        siteId,
        voice,
        theme = 'system',
        paletteLight = {},
        paletteDark = {},
        config = {},
    } = payload;

    const prefersDark = matchMedia?.('(prefers-color-scheme: dark)').matches;
    const styles = (theme === 'dark' || (theme === 'system' && prefersDark)) ? paletteDark : paletteLight;

    // ---- DOM helpers ----
    const el = (tag, css = '') => { const n = document.createElement(tag); if (css) n.style.cssText = css; return n; };

    let iconSvg = '';
    const icon = config.buttonIcon || 'default';
    switch (icon) {
        case 'chat':
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
            break;
        case 'help':
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            break;
        case 'message':
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
            break;
        default:
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style="width:100%;height:100%;fill:currentColor;transition:transform 0.3s ease;">
            <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z"/>
            <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z"/>
          </svg>`;
            break;
    }

    // ---- Ensure CSS (DaisyUI optional) ----
    if (!document.querySelector('link[data-hn-styles]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/daisyui@5.0.50/dist/full.css';
        link.setAttribute('data-hn-styles', 'true');
        document.head.appendChild(link);
    }

    // ---- Session ----
    let sessionId = 'sid_' + Math.random().toString(36).slice(2);
    try {
        sessionId = localStorage.getItem('hn_sid') || crypto.randomUUID();
        localStorage.setItem('hn_sid', sessionId);
    } catch { }

    // ---- Bubble ----
    const pos = config.position || 'bottom-right';
    const posBubble = {
        'bottom-right': 'bottom:20px;right:20px;',
        'bottom-left': 'bottom:20px;left:20px;',
        'top-right': 'top:20px;right:20px;',
        'top-left': 'top:20px;left:20px;'
    }[pos];

    const bubble = el('div',
        `position:fixed;${posBubble}width:60px;height:60px;border-radius:50%;` +
        `box-shadow:0 10px 30px rgba(0,0,0,.2);background:${styles.bubbleBackground};` +
        `color:${styles.bubbleColor};display:flex;align-items:center;justify-content:center;` +
        `cursor:pointer;z-index:999999;transition:all .2s ease;padding:12px;`
    );

    // Add hover effect to bubble
    bubble.addEventListener('mouseenter', () => {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.boxShadow = '0 12px 35px rgba(0,0,0,.25)';
    });
    bubble.addEventListener('mouseleave', () => {
        bubble.style.transform = 'scale(1)';
        bubble.style.boxShadow = '0 10px 30px rgba(0,0,0,.2)';
    });

    bubble.innerHTML = iconSvg
    document.body.appendChild(bubble);

    // ---- Panel ----
    // Function to calculate maximum available height for chat panel
    function calculateMaxPanelHeight() {
        const bubbleOffsetFromEdge = 20; // 20px from edge
        const bubbleHeight = 40; // bubble is 40px tall
        const panelGap = 30; // gap between bubble and panel
        const topPadding = 20; // minimum padding from top

        if (pos.startsWith('bottom-')) {
            // For bottom positions, calculate from bottom edge to top of viewport
            const maxHeight = window.innerHeight - bubbleOffsetFromEdge - bubbleHeight - panelGap - topPadding;
            return Math.max(200, maxHeight); // minimum 200px
        } else {
            // For top positions, calculate from top edge to bottom of viewport  
            const maxHeight = window.innerHeight - bubbleOffsetFromEdge - bubbleHeight - panelGap - topPadding;
            return Math.max(200, maxHeight); // minimum 200px
        }
    }

    const posPanel = {
        'bottom-right': 'bottom:90px;right:20px;',
        'bottom-left': 'bottom:90px;left:20px;',
        'top-right': 'top:90px;right:20px;',
        'top-left': 'top:90px;left:20px;'
    }[pos];

    // Start with initial compact size, but allow growing to max available
    const maxPanelHeight = calculateMaxPanelHeight();
    const initialPanelHeight = Math.min(600, maxPanelHeight); // Start with 450px or max available if smaller
    const panel = el('div',
        `position:fixed;${posPanel}width:360px;height:${initialPanelHeight}px;max-height:${maxPanelHeight}px;background:${styles.panelBackground};` +
        `border-radius:16px;box-shadow:-10px 10px 25px -5px rgba(0,0,0,.1),` +
        `0 8px 10px -6px rgba(0,0,0,.1);display:none;flex-direction:column;overflow:hidden;z-index:999998;` +
        `font-family:${styles.fontFamily};`
    );
    document.body.appendChild(panel);

    // Function to update panel height constraints on window resize
    function updatePanelHeight() {
        const newMaxHeight = calculateMaxPanelHeight();
        panel.style.maxHeight = `${newMaxHeight}px`;

        // If current height exceeds new max, adjust it
        const currentHeight = parseInt(panel.style.height) || initialPanelHeight;
        if (currentHeight > newMaxHeight) {
            panel.style.height = `${newMaxHeight}px`;
        }
    }

    // Function to dynamically grow panel based on content
    function adjustPanelSize() {
        if (!msgs) return;

        const headerHeight = 60;
        const inputHeight = 80;
        const msgsPadding = 32; // top + bottom padding
        const maxAvailableHeight = calculateMaxPanelHeight();

        // Calculate required height based on messages content
        const messagesScrollHeight = msgs.scrollHeight;
        const requiredPanelHeight = messagesScrollHeight + headerHeight + inputHeight + msgsPadding;

        // Use larger of: initial size or required size, but not more than max available
        const newPanelHeight = Math.min(
            Math.max(initialPanelHeight, requiredPanelHeight),
            maxAvailableHeight
        );

        // Update panel height
        panel.style.height = `${newPanelHeight}px`;

        // Update messages container height
        const newMessagesHeight = newPanelHeight - headerHeight - inputHeight;
        msgs.style.height = `${Math.max(150, newMessagesHeight)}px`;
    }

    // Header
    const header = el('div', `padding:14px 16px;border-bottom:1px solid ${styles.borderColor};font-weight:600;color:${styles.panelHeaderColor};background:${styles.panelHeaderBackground};display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0;`);
    const title = el('span');
    title.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;color:${styles.panelHeaderColor};">
            <div style="width:30px;height:30px;margin:4px;padding:4px;display:flex;align-items:center;justify-content:center;">
                ${iconSvg}
            </div>
            <span>${config.aiName || 'helpNINJA'}</span>
        </div>
    `;
    const titleButtons = el('div', `display:flex;align-items:end;justify-content:end;gap:8px;position:relative;`);

    // Create dropdown container
    const dropdownContainer = el('div', `position:relative;`);

    // Menu button (3 dots)
    const menuButton = el('button', `background:${styles.buttonBackground};color:${styles.buttonColor};border:none;cursor:pointer;padding:8px;border-radius:50%;height:40px;width:40px;transition:all .2s ease;display:flex;align-items:center;justify-content:center;`);
    menuButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><circle cx="320" cy="160" r="48"/><circle cx="320" cy="320" r="48"/><circle cx="320" cy="480" r="48"/></svg>';

    // Dropdown menu
    const dropdownMenu = el('div', `position:absolute;top:45px;right:0;background:${styles.panelBackground};border:1px solid ${styles.borderColor};border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;min-width:180px;display:none;overflow:hidden;`);

    // Menu items
    const menuItems = [
        {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M115.9 448.9C83.3 408.6 64 358.4 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304C576 436.5 461.4 544 320 544C283.5 544 248.8 536.8 217.4 524L101 573.9C97.3 575.5 93.5 576 89.5 576C75.4 576 64 564.6 64 550.5C64 546.2 65.1 542 67.1 538.3L115.9 448.9zM153.2 418.7C165.4 433.8 167.3 454.8 158 471.9L140 505L198.5 479.9C210.3 474.8 223.7 474.7 235.6 479.6C261.3 490.1 289.8 496 319.9 496C437.7 496 527.9 407.2 527.9 304C527.9 200.8 437.8 112 320 112C202.2 112 112 200.8 112 304C112 346.8 127.1 386.4 153.2 418.7z"/></svg>',
            text: 'Send Feedback',
            action: 'feedback'
        },
        {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M320 48C339.4 48 356.4 58.1 365.3 74.7L394.7 124.6C399.1 133.1 409.5 137.6 419.2 135.2L476.1 120.1C494.9 115.3 513.9 126.3 518.7 145.1L533.8 202C536.2 211.7 544.9 218.4 555.4 218.4H608C632.8 218.4 652.8 238.4 652.8 263.2V376.8C652.8 401.6 632.8 421.6 608 421.6H555.4C544.9 421.6 536.2 428.3 533.8 438L518.7 494.9C513.9 513.7 494.9 524.7 476.1 519.9L419.2 504.8C409.5 502.4 399.1 506.9 394.7 515.4L365.3 565.3C356.4 581.9 339.4 592 320 592C300.6 592 283.6 581.9 274.7 565.3L245.3 515.4C240.9 506.9 230.5 502.4 220.8 504.8L163.9 519.9C145.1 524.7 126.1 513.7 121.3 494.9L106.2 438C103.8 428.3 95.1 421.6 84.6 421.6H32C7.2 421.6 -12.8 401.6 -12.8 376.8V263.2C-12.8 238.4 7.2 218.4 32 218.4H84.6C95.1 218.4 103.8 211.7 106.2 202L121.3 145.1C126.1 126.3 145.1 115.3 163.9 120.1L220.8 135.2C230.5 137.6 240.9 133.1 245.3 124.6L274.7 74.7C283.6 58.1 300.6 48 320 48zM320 272C337.7 272 352 286.3 352 304V424C352 441.7 337.7 456 320 456C302.3 456 288 441.7 288 424V304C288 286.3 302.3 272 320 272zM320 144C302.3 144 288 158.3 288 176V208C288 225.7 302.3 240 320 240C337.7 240 352 225.7 352 208V176C352 158.3 337.7 144 320 144z"/></svg>',
            text: 'Clear Chat',
            action: 'clear'
        },
        {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M320 200C340.9 200 356.4 215.5 356.4 236.4V356.4H476.4C497.3 356.4 512.8 371.9 512.8 392.8C512.8 413.7 497.3 429.2 476.4 429.2H356.4V549.2C356.4 570.1 340.9 585.6 320 585.6C299.1 585.6 283.6 570.1 283.6 549.2V429.2H163.6C142.7 429.2 127.2 413.7 127.2 392.8C127.2 371.9 142.7 356.4 163.6 356.4H283.6V236.4C283.6 215.5 299.1 200 320 200zM96 64C60.7 64 32 92.7 32 128V512C32 547.3 60.7 576 96 576H544C579.3 576 608 547.3 608 512V128C608 92.7 579.3 64 544 64H96zM96 32H544C597.0 32 640 75.0 640 128V512C640 565.0 597.0 608 544 608H96C43.0 608 0 565.0 0 512V128C0 75.0 43.0 32 96 32z"/></svg>',
            text: 'Export Chat',
            action: 'export'
        }
    ];

    menuItems.forEach(item => {
        const menuItem = el('div', `padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;background-color:${styles.panelHeaderBackground};color:${styles.panelHeaderColor};transition:background-color 0.2s ease;border-bottom:1px solid ${styles.borderColor};`);
        menuItem.innerHTML = `
            <div style="width:18px;height:18px;flex-shrink:0;">${item.icon}</div>
            <span style="font-size:14px;">${item.text}</span>
        `;

        // Hover effect
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = styles.panelHeaderBackground + '16';
        });
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = styles.panelHeaderBackground;
        });

        // Click handler
        menuItem.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
            handleMenuAction(item.action);
        });

        dropdownMenu.appendChild(menuItem);
    });

    // Remove border from last item
    const lastItem = dropdownMenu.lastElementChild;
    if (lastItem) lastItem.style.borderBottom = 'none';

    // Menu button click handler
    menuButton.onclick = (e) => {
        e.stopPropagation();
        const isVisible = dropdownMenu.style.display === 'block';
        dropdownMenu.style.display = isVisible ? 'none' : 'block';
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
    });

    // Menu button hover effects
    menuButton.addEventListener('mouseenter', () => {
        menuButton.style.transform = 'scale(1.1)';
        menuButton.style.opacity = '0.8';
    });
    menuButton.addEventListener('mouseleave', () => {
        menuButton.style.transform = 'scale(1)';
        menuButton.style.opacity = '1';
    });

    dropdownContainer.appendChild(menuButton);
    dropdownContainer.appendChild(dropdownMenu);
    const close = el('button', `background:${styles.buttonBackground};color:${styles.buttonColor};border:none;cursor:pointer;padding:6px;border-radius:50%;height:40px;width:40px;transition:all .2s ease;`);
    close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M506.4 135.4C514.9 125.3 513.6 110.1 503.5 101.6C493.4 93.1 478.2 94.4 469.7 104.5L320 282.7L170.4 104.6C161.9 94.4 146.7 93.1 136.6 101.6C126.5 110.1 125.1 125.3 133.6 135.4L288.7 320L133.6 504.6C125.1 514.8 126.4 529.9 136.5 538.4C146.6 546.9 161.8 545.6 170.3 535.5L320 357.3L469.6 535.4C478.1 545.6 493.3 546.9 503.4 538.3C513.5 529.7 514.9 514.6 506.3 504.5L351.3 320L506.4 135.4z"/></svg>';
    close.onclick = () => { panel.style.display = 'none'; bubble.style.display = 'flex'; };

    // Add hover effect to close button
    close.addEventListener('mouseenter', () => {
        close.style.transform = 'scale(1.1)';
        close.style.opacity = '0.8';
    });
    close.addEventListener('mouseleave', () => {
        close.style.transform = 'scale(1)';
        close.style.opacity = '1';
    });
    // Handle menu actions
    function handleMenuAction(action) {
        switch (action) {
            case 'feedback':
                openFeedbackModal();
                break;
            case 'clear':
                clearChat();
                break;
            case 'export':
                exportChat();
                break;
        }
    }

    // Clear chat function
    async function clearChat() {
        if (confirm('Are you sure you want to clear this chat? This will start a new conversation.')) {
            try {
                // Call API to clear conversation on server
                const response = await fetch(`${baseOrigin}/api/conversations/clear`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        tenantId: tenantId
                    })
                });

                if (!response.ok) {
                    console.warn('Failed to clear conversation on server:', response.status);
                }
            } catch (error) {
                console.warn('Error clearing conversation on server:', error);
            }

            // Clear messages display
            msgs.innerHTML = '';

            // Generate new session ID
            sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sid_' + Math.random().toString(36).slice(2);
            localStorage.setItem('hn_sid', sessionId);

            // Clear chat history from storage
            const oldStorageKey = `hn_chat_${sessionId}`;
            localStorage.removeItem(oldStorageKey);

            // Reset polling state
            latestMessageTime = null;

            // Show initial message if configured
            if (config.initialMessage) {
                addMessage('assistant', config.initialMessage, false);
            }

            // Restart polling with new session
            if (typeof pollForAgentMessages === 'function') {
                pollForAgentMessages();
            }
        }
    }

    // Export chat function
    function exportChat() {
        const messages = Array.from(msgs.querySelectorAll('[data-role]')).map(msgEl => {
            const role = msgEl.getAttribute('data-role');
            const content = msgEl.querySelector('.message-content')?.textContent || '';
            const timestamp = msgEl.getAttribute('data-timestamp') || new Date().toISOString();
            return { role, content, timestamp };
        });

        if (messages.length === 0) {
            alert('No messages to export.');
            return;
        }

        const exportData = {
            conversation: {
                sessionId: sessionId,
                tenantId: tenantId,
                aiName: config.aiName || 'helpNINJA',
                exportedAt: new Date().toISOString(),
                messages: messages
            }
        };

        // Create downloadable file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `helpninja-chat-${sessionId.slice(-8)}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(url);
    }

    header.appendChild(title);
    titleButtons.appendChild(dropdownContainer);
    titleButtons.appendChild(close);
    header.appendChild(titleButtons);

    // Messages - start with initial compact size
    const headerHeight = 60;
    const inputHeight = 80;
    const initialMessagesHeight = initialPanelHeight - headerHeight - inputHeight;
    const msgs = el('div', `padding:16px;gap:16px;display:flex;flex-direction:column;overflow-y:auto;height:${initialMessagesHeight}px;background:${styles.messagesBackground};color:${styles.messagesColor};`);
    msgs.id = 'hn_msgs';

    // Listen for window resize to update panel height (after msgs is defined)
    window.addEventListener('resize', updatePanelHeight);

    // Input
    const inputWrap = el('div', `display:flex;border-top:1px solid "${styles.inputBorder}";background:${styles.panelBackground};padding:12px 16px 16px;`);
    const input = el('input', `flex:1;padding:12px 16px;border:0 solid ${styles.inputBorder};border-radius:10px;outline:none;color:${styles.buttonColor};background:${styles.buttonBackground};margin-right:8px;`);
    input.placeholder = 'Type your message...';
    const sendBtn = el('button', `width:40px;height:40px;border:0;background:${styles.buttonBackground};color:${styles.buttonColor};cursor:pointer;border-radius:50%;padding:8px;rotate:-45deg;transition:all .2s ease;`);
    sendBtn.title = 'Send';
    sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 640 640"><path d="M201.9 344L126.9 512.6L493.2 344L201.9 344zM493.2 296L126.9 127.4L201.9 296L493.2 296zM66.8 529.6L160 320L66.8 110.4C65 106.2 64 101.6 64 97C64 78.8 78.7 64 96.8 64C101.5 64 106.2 65 110.5 67L586.2 286C599.5 292.1 608 305.4 608 320C608 334.6 599.5 347.9 586.2 354L110.5 573C106.2 575 101.5 576 96.8 576C78.7 576 64 561.2 64 543C64 538.4 65 533.8 66.8 529.6z"/></svg>`;

    // Add hover effect to send button
    sendBtn.addEventListener('mouseenter', () => {
        sendBtn.style.transform = 'scale(1.1) rotate(-45deg)';
        sendBtn.style.opacity = '0.8';
    });
    sendBtn.addEventListener('mouseleave', () => {
        sendBtn.style.transform = 'scale(1) rotate(-45deg)';
        sendBtn.style.opacity = '1';
    });
    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);
    panel.appendChild(header);
    panel.appendChild(msgs);
    panel.appendChild(inputWrap);

    const helpNinjaFooter = el('div', `padding:2px;margin-bottom:8px;font-size:12px;color:${styles.messagesColor};text-align:center;`);
    helpNinjaFooter.innerHTML = `<span>Powered by <a href="https://helpninja.ai" target="_blank" style="color:${styles.messagesColor};">helpNINJA</a></span>`;
    panel.appendChild(helpNinjaFooter);

    // ---- Chat History Management ----
    function extractMessagesFromDOM() {
        if (!msgs || !msgs.children) return [];

        return Array.from(msgs.children).map(row => {
            const isUser = row.style.justifyContent === 'flex-end';

            // For user messages: bubble is first child, icon is second child
            // For assistant messages: icon is first child, bubble is second child
            const bubble = isUser ? row.children[0] : row.children[1];
            if (!bubble) return null;

            return {
                role: isUser ? 'user' : 'assistant',
                content: bubble.textContent || bubble.innerText || '',
                timestamp: new Date().toISOString()
            };
        }).filter(msg => msg !== null);
    }

    function saveChatHistory() {
        try {
            const messages = extractMessagesFromDOM();
            if (messages.length === 0) return; // Don't save empty history

            const historyData = {
                sessionId: sessionId,
                messages: messages,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };

            const storageKey = `hn_chat_${sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify(historyData));

            // Clean up old sessions (keep last 5 sessions max)
            cleanupOldSessions();
        } catch (e) {
            console.warn('helpNINJA: Failed to save chat history:', e.name);
            // Silently fail - don't break the user experience
        }
    }

    function restoreChatHistory() {
        try {
            const storageKey = `hn_chat_${sessionId}`;
            const savedHistory = localStorage.getItem(storageKey);

            if (!savedHistory) return false;

            const historyData = JSON.parse(savedHistory);

            // Validate session matches and data is recent (within 30 days)
            if (historyData.sessionId !== sessionId) return false;

            const lastUpdated = new Date(historyData.lastUpdated);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (lastUpdated < thirtyDaysAgo) {
                // Remove stale data
                localStorage.removeItem(storageKey);
                return false;
            }

            // Restore messages
            if (historyData.messages && Array.isArray(historyData.messages)) {
                historyData.messages.forEach(msg => {
                    if (msg.role && msg.content) {
                        add(msg.role, msg.content, false); // false = don't save to avoid recursion
                    }
                });
                return true;
            }

            return false;
        } catch (e) {
            console.warn('helpNINJA: Failed to restore chat history:', e.name);
            // Try to remove corrupted data
            try {
                localStorage.removeItem(`hn_chat_${sessionId}`);
            } catch { }
            return false;
        }
    }

    function cleanupOldSessions() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hn_chat_')) {
                    keys.push(key);
                }
            }

            // Keep only the 5 most recent sessions
            if (keys.length > 5) {
                const sessions = keys.map(key => {
                    try {
                        const data = JSON.parse(localStorage.getItem(key) || '{}');
                        return {
                            key: key,
                            lastUpdated: new Date(data.lastUpdated || 0)
                        };
                    } catch {
                        return { key: key, lastUpdated: new Date(0) };
                    }
                }).sort((a, b) => b.lastUpdated - a.lastUpdated);

                // Remove old sessions
                sessions.slice(5).forEach(session => {
                    try {
                        localStorage.removeItem(session.key);
                    } catch { }
                });
            }
        } catch (e) {
            // Cleanup failed, but don't break functionality
            console.warn('helpNINJA: Failed to cleanup old chat sessions:', e.name);
        }
    }

    async function loadConversationHistory() {
        // Try localStorage first (faster)
        if (restoreChatHistory()) {
            return true;
        }

        // Fallback to server if localStorage failed or is empty
        try {
            const response = await fetch(
                `${baseOrigin}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}&tenantId=${encodeURIComponent(tenantId)}&limit=50`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.warn('helpNINJA: Server history request failed:', response.status);
                return false;
            }

            const data = await response.json();

            if (data.success && data.messages && Array.isArray(data.messages)) {
                // Restore messages from server
                data.messages.forEach(msg => {
                    if (msg.role && msg.content) {
                        add(msg.role, msg.content, false); // false = don't save to avoid recursion
                    }
                });

                // Save to localStorage for future use (if possible)
                try {
                    saveChatHistory();
                } catch (e) {
                    // localStorage save failed, but we have the history displayed
                    console.warn('helpNINJA: Failed to cache server history locally:', e.name);
                }

                return data.messages.length > 0;
            }

            return false;
        } catch (e) {
            console.warn('helpNINJA: Failed to load server history:', e.name);
            return false;
        }
    }

    // Helpers
    function add(role, htmlOrText, shouldSave = true) {
        const timestamp = new Date().toISOString();
        const row = el('div', `display:flex;gap:8px;margin-bottom:12px;${role === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}`);

        // Add data attributes for export functionality
        row.setAttribute('data-role', role);
        row.setAttribute('data-timestamp', timestamp);

        // Create icon
        const icon = el('div', `width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;${role === 'user'
            ? `background:${styles.userBubbleBackground};color:${styles.userBubbleColor};`
            : `background:${styles.assistantBubbleBackground};color:${styles.assistantBubbleColor};`
            }`);

        // Set icon content
        if (role === 'assistant') {
            icon.innerHTML = `<div style="width:20px;height:20px;">${iconSvg}</div>`;
        } else {
            icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        }

        // Create bubble
        const bub = el('div',
            `white-space:pre-wrap;max-width:280px;border-radius:18px;` +
            (role === 'user'
                ? `background:${styles.userBubbleBackground};color:${styles.userBubbleColor};border-top-right-radius:4px;padding:12px 16px;`
                : `background:${styles.assistantBubbleBackground};color:${styles.assistantBubbleColor};border-top-left-radius:4px;padding:12px 16px;`)
        );

        // Add class for easy content extraction during export
        bub.className = 'message-content';

        // Set bubble content
        if (role === 'assistant') {
            bub.innerHTML = htmlOrText;
        } else {
            bub.textContent = htmlOrText;
        }

        // Append in correct order for alignment
        if (role === 'user') {
            // User: bubble first, then icon (right-aligned)
            row.appendChild(bub);
            row.appendChild(icon);
        } else {
            // Assistant: icon first, then bubble (left-aligned)
            row.appendChild(icon);
            row.appendChild(bub);
        }

        msgs.appendChild(row);

        // Adjust panel size based on content after adding message
        adjustPanelSize();

        // Save history if requested (skip for restoration to avoid recursion)
        if (shouldSave) {
            saveChatHistory();
        }

        msgs.scrollTop = msgs.scrollHeight;
    }

    async function send() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        add('user', text);

        const res = await fetch(`${baseOrigin}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                tenantId,
                sessionId,
                message: text,
                voice: voice || config.voice || 'friendly',
                siteId: siteId || config.siteId || ''
            })
        }).catch(() => null);

        if (!res) return add('assistant', 'Network error. Try again.');
        let j = null; try { j = await res.json(); } catch { }
        if (!res.ok) return add('assistant', (j && (j.message || j.error)) || 'Sorry, something went wrong.');
        return add('assistant', j?.html || j?.answer || 'I didn’t understand that—mind rephrasing?');
    }

    // Wire up
    const open = async () => {
        panel.style.display = 'flex';
        bubble.style.display = 'none';

        // Only show welcome message if no chat history exists
        if (!msgs.children.length) {
            // Try to load conversation history (localStorage first, then server)
            const historyLoaded = await loadConversationHistory();

            // If no history was loaded, show welcome message
            if (!historyLoaded) {
                add('assistant', config.welcomeMessage || 'Hi there! How can I help?');
            }
        }

        // Adjust panel size when opening to fit existing content
        setTimeout(() => {
            adjustPanelSize();
            input.focus();
        }, 50);
    };
    bubble.onclick = () => (panel.style.display === 'none' ? open() : (panel.style.display = 'none', bubble.style.display = 'flex'));
    sendBtn.onclick = send;
    input.addEventListener('keydown', (e) => (e.key === 'Enter') && send());

    const auto = parseInt(config.autoOpenDelay || 0, 10);
    if (auto > 0) setTimeout(open, auto);

    // ---- Agent Message Polling ----
    let lastMessageTime = null;
    let pollInterval = null;
    let displayedMessageIds = new Set(); // Track displayed messages to prevent duplicates

    // Function to poll for new agent messages
    async function pollForAgentMessages() {
        if (!sessionId) return;

        try {
            const url = `${baseOrigin}/api/conversations/session/${encodeURIComponent(sessionId)}/messages${lastMessageTime ? `?since=${encodeURIComponent(lastMessageTime)}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) return;

            const data = await response.json();
            if (data.messages?.length) {
                let latestMessageTime = lastMessageTime;
                let hasNewAgentMessage = false;

                data.messages.forEach(msg => {
                    // Update to the latest message timestamp
                    if (!latestMessageTime || msg.created_at > latestMessageTime) {
                        latestMessageTime = msg.created_at;
                    }

                    // Only show new human agent messages (skip AI messages as they're already handled by send())
                    if (msg.role === 'assistant' && msg.is_human_response && !displayedMessageIds.has(msg.id)) {
                        add('assistant', msg.content, false); // false = don't save to history to avoid duplication
                        displayedMessageIds.add(msg.id); // Mark as displayed
                        hasNewAgentMessage = true;
                    }
                });

                // Update lastMessageTime to prevent re-polling the same messages
                lastMessageTime = latestMessageTime;

                // Flash the bubble if chat is closed and there was a new agent message
                if (hasNewAgentMessage && panel.style.display === 'none') {
                    flashBubble();
                }
            }
        } catch (error) {
            console.error('Error polling for agent messages:', error);
        }
    }

    // Function to flash the bubble to indicate new message
    function flashBubble() {
        let flashCount = 0;
        const originalBackground = bubble.style.background;

        const flashInterval = setInterval(() => {
            bubble.style.background = flashCount % 2 === 0 ? '#10b981' : originalBackground; // Green flash
            flashCount++;

            if (flashCount >= 6) { // Flash 3 times
                clearInterval(flashInterval);
                bubble.style.background = originalBackground;
            }
        }, 300);
    }

    // Start polling when conversation becomes active (after first message)
    function startPolling() {
        if (pollInterval) return; // Already polling

        // Set initial timestamp to now to only catch new messages
        if (!lastMessageTime) {
            lastMessageTime = new Date().toISOString();
        }

        // Poll every 3 seconds for human agent responses
        pollInterval = setInterval(pollForAgentMessages, 3000);
    }

    // Stop polling (for cleanup)
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    // Start polling after first user interaction
    const originalSend = send;
    send = async function () {
        const result = await originalSend();

        // Start polling after first message is sent
        if (!pollInterval) {
            startPolling();
        }

        return result;
    };

    // ---- Feedback Modal ----
    let selectedFiles = [];
    let feedbackModal = null;

    // File handling functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain', 'application/pdf'];

        if (file.size > maxSize) {
            return 'File size must be less than 10MB';
        }
        if (!allowedTypes.includes(file.type)) {
            return 'File type not allowed. Please use images, text files, or PDFs';
        }
        return null;
    }

    function updateFileList() {
        const container = document.getElementById('hn_feedback_files_container');
        if (!container) return;

        // Re-calculate theme colors
        const prefersDark = matchMedia?.('(prefers-color-scheme: dark)').matches;
        const currentStyles = (theme === 'dark' || (theme === 'system' && prefersDark)) ? paletteDark : paletteLight;
        const textColor = currentStyles.textColor || '#333333';
        const mutedTextColor = currentStyles.mutedTextColor || '#666666';

        container.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = el('div', `display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.05);border-radius:6px;margin-bottom:8px;`);

            const fileInfo = el('div', `display:flex;align-items:center;gap:8px;flex:1;`);
            const fileIcon = el('div', `font-size:16px;`);
            fileIcon.textContent = '📎';

            const fileDetails = el('div');
            const fileName = el('div', `font-size:13px;color:${textColor};font-weight:500;`);
            fileName.textContent = file.name;
            const fileSize = el('div', `font-size:11px;color:${mutedTextColor};`);
            fileSize.textContent = formatFileSize(file.size);

            fileDetails.appendChild(fileName);
            fileDetails.appendChild(fileSize);

            fileInfo.appendChild(fileIcon);
            fileInfo.appendChild(fileDetails);

            const removeBtn = el('button', `background:none;border:none;color:#ef4444;cursor:pointer;padding:4px;font-size:16px;`);
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                selectedFiles.splice(index, 1);
                updateFileList();
            };

            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            container.appendChild(fileItem);
        });
    }

    function addFiles(files) {
        Array.from(files).forEach(file => {
            const error = validateFile(file);
            if (error) {
                alert(error);
                return;
            }

            // Check for duplicates
            if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        });
        updateFileList();
    }

    function createFeedbackModal() {
        // Create modal backdrop
        const backdrop = el('div', `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000000;display:flex;align-items:center;justify-content:center;`);

        // Create modal content
        const modal = el('div', `background:${styles.panelBackground};font-family:${styles.fontFamily};border-radius:16px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);`);

        // Modal header
        const modalHeader = el('div', `padding:20px 24px;border-bottom:1px solid ${styles.borderColor};display:flex;align-items:center;justify-content:space-between;background:${styles.panelHeaderBackground};color:${styles.panelHeaderColor};`);
        const modalTitle = el('h2', `margin:0;font-size:18px;font-weight:600;color:${styles.panelHeaderColor};`);
        modalTitle.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:24px;height:24px;width:24px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M115.9 448.9C83.3 408.6 64 358.4 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304C576 436.5 461.4 544 320 544C283.5 544 248.8 536.8 217.4 524L101 573.9C97.3 575.5 93.5 576 89.5 576C75.4 576 64 564.6 64 550.5C64 546.2 65.1 542 67.1 538.3L115.9 448.9zM153.2 418.7C165.4 433.8 167.3 454.8 158 471.9L140 505L198.5 479.9C210.3 474.8 223.7 474.7 235.6 479.6C261.3 490.1 289.8 496 319.9 496C437.7 496 527.9 407.2 527.9 304C527.9 200.8 437.8 112 320 112C202.2 112 112 200.8 112 304C112 346.8 127.1 386.4 153.2 418.7z"/></svg></div>
            <div style="color:${styles.panelHeaderColor};">
                <div style="font-size:18px;font-weight:600;">Share Your Feedback</div>
                <div style="font-size:14px;font-weight:100;color:${styles.panelHeaderColor};">Help us improve by sharing your thoughts, reporting issues, or suggesting features</div>
            </div>
        </div>
        `;

        const modalClose = el('button', `background:none;border:none;font-size:24px;color:${styles.panelHeaderColor};cursor:pointer;padding:4px;`);
        modalClose.innerHTML = '×';
        modalClose.onclick = closeFeedbackModal;

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(modalClose);

        // Modal body
        const modalBody = el('div', `padding:24px;background:${styles.messagesBackground};color:${styles.messagesColor};`);

        // Feedback form HTML (using the improved UX design)
        modalBody.innerHTML = `
            <form id="hn_feedback_form" style="display:flex;flex-direction:column;gap:20px;">
                <!-- Feedback Type Selection -->
                <fieldset style="border:none;padding:0;margin:0;">
                    <legend style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:12px;padding:0;">What type of feedback is this?</legend>
                    <div id="hn_feedback_types" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <label class="feedback-type-option" data-value="bug" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="bug" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320 64C267 64 224 107 224 160L224 163.6C224 179.3 236.7 192 252.4 192L387.5 192C403.2 192 415.9 179.3 415.9 163.6L415.9 160C415.9 107 372.9 64 319.9 64zM432 344L432 416C432 469.6 394.3 514.4 344 525.4L344 360C344 346.7 333.3 336 320 336C306.7 336 296 346.7 296 360L296 525.4C245.7 514.4 208 469.6 208 416L208 344C208 313.1 233.1 288 264 288L376 288C406.9 288 432 313.1 432 344zM179.8 282.9C170.3 296 163.8 311.3 161.2 328L56 328C42.7 328 32 338.7 32 352C32 365.3 42.7 376 56 376L160 376L160 416C160 422.5 160.4 428.9 161.1 435.1L73.6 500.8C63 508.8 60.8 523.8 68.8 534.4C76.8 545 91.8 547.2 102.4 539.2L175.4 484.5C201 538.6 256.1 576 320 576C383.9 576 439 538.6 464.6 484.5L537.6 539.2C548.2 547.2 563.2 545 571.2 534.4C579.2 523.8 577 508.8 566.4 500.8L478.9 435.1C479.6 428.8 480 422.4 480 416L480 376L584 376C597.3 376 608 365.3 608 352C608 338.7 597.3 328 584 328L478.8 328C476.2 311.3 469.7 296 460.2 282.9L566.4 203.2C577 195.2 579.2 180.2 571.2 169.6C563.2 159 548.2 156.8 537.6 164.8L422.6 251C408.6 243.9 392.7 240 376 240L264 240C247.2 240 231.4 244 217.4 251L102.4 164.8C91.8 156.8 76.8 159 68.8 169.6C60.8 180.2 63 195.2 73.6 203.2L179.8 282.9z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">Bug Report</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Something is broken</div>
                                </div>
                            </div>
                        </label>
                        
                        <label class="feedback-type-option" data-value="feature" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="feature" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M424.5 355.1C449 329.2 464 294.4 464 256C464 176.5 399.5 112 320 112C240.5 112 176 176.5 176 256C176 294.4 191 329.2 215.5 355.1C236.8 377.5 260.4 409.1 268.8 448L371.2 448C379.6 409 403.2 377.5 424.5 355.1zM459.3 388.1C435.7 413 416 443.4 416 477.7L416 496C416 540.2 380.2 576 336 576L304 576C259.8 576 224 540.2 224 496L224 477.7C224 443.4 204.3 413 180.7 388.1C148 353.7 128 307.2 128 256C128 150 214 64 320 64C426 64 512 150 512 256C512 307.2 492 353.7 459.3 388.1zM272 248C272 261.3 261.3 272 248 272C234.7 272 224 261.3 224 248C224 199.4 263.4 160 312 160C325.3 160 336 170.7 336 184C336 197.3 325.3 208 312 208C289.9 208 272 225.9 272 248z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">Feature Request</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Suggest an improvement</div>
                                </div>
                            </div>
                        </label>
                        
                        <label class="feedback-type-option" data-value="improvement" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="improvement" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M337.5 79C328.1 69.6 312.9 69.6 303.6 79L135.5 247C126.1 256.4 126.1 271.6 135.5 280.9C144.9 290.2 160.1 290.3 169.4 280.9L296.4 153.9L296.4 560C296.4 573.3 307.1 584 320.4 584C333.7 584 344.4 573.3 344.4 560L344.4 153.9L471.4 280.9C480.8 290.3 496 290.3 505.3 280.9C514.6 271.5 514.7 256.3 505.3 247L337.5 79z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">Improvement</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Make something better or more efficient</div>
                                </div>
                            </div>
                        </label>
                        
                        <label class="feedback-type-option" data-value="ui_ux" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="ui_ux" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M530.4 64C513.1 64 496.3 69.8 482.6 80.4L278.1 240.3C252.8 260 236.7 288.9 232.9 320.3C230 320.1 227 320 224 320C153.3 320 96 377.3 96 448C96 456.6 96.9 465.1 98.5 473.2C102.1 491.3 90 512 71.5 512L64 512C46.3 512 32 526.3 32 544C32 561.7 46.3 576 64 576L224 576C294.7 576 352 518.7 352 448C352 445 351.9 442.1 351.7 439.1C383.1 435.3 412 419.1 431.7 393.9L591.6 189.3C602.2 175.7 608 158.9 608 141.6C608 98.7 573.3 64 530.4 64zM339.1 392C326.6 366.3 305.7 345.4 280 332.9C280.6 311.5 290.7 291.4 307.6 278.1L512.2 118.3C517.4 114.2 523.8 112 530.4 112C546.7 112 560 125.2 560 141.6C560 148.2 557.8 154.6 553.7 159.8L393.9 364.3C380.7 381.3 360.5 391.4 339.1 391.9zM304 448C304 492.2 268.2 528 224 528L131.9 528C132.4 527.3 132.9 526.5 133.4 525.8C144.9 508.3 150 485.9 145.6 463.8C144.6 458.7 144 453.4 144 448C144 403.8 179.8 368 224 368C268.2 368 304 403.8 304 448z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">UI/UX Feedback</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Visual design or user experience suggestions</div>
                                </div>
                            </div>
                        </label>
                        <label class="feedback-type-option" data-value="performance" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="performance" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM352 176C352 158.3 337.7 144 320 144C302.3 144 288 158.3 288 176C288 193.7 302.3 208 320 208C337.7 208 352 193.7 352 176zM320 472C350.9 472 376 446.9 376 416C376 401.6 370.6 388.5 361.6 378.5L422.1 233.2C427.2 221 421.4 206.9 409.2 201.8C397 196.7 382.9 202.5 377.8 214.7L317.3 360.1C287.6 361.5 264 386 264 416C264 446.9 289.1 472 320 472zM256 224C256 206.3 241.7 192 224 192C206.3 192 192 206.3 192 224C192 241.7 206.3 256 224 256C241.7 256 256 241.7 256 224zM176 352C193.7 352 208 337.7 208 320C208 302.3 193.7 288 176 288C158.3 288 144 302.3 144 320C144 337.7 158.3 352 176 352zM496 320C496 302.3 481.7 288 464 288C446.3 288 432 302.3 432 320C432 337.7 446.3 352 464 352C481.7 352 496 337.7 496 320z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">Performance Issue</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Speed, loading, or responsiveness concerns</div>
                                </div>
                            </div>
                        </label>
                        <label class="feedback-type-option" data-value="general" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:12px;transition:all 0.2s ease;background:${styles.panelBackground};">
                            <input type="radio" name="feedback_type" value="general" style="display:none;">
                            <div style="display:flex;align-items:start;gap:8px;">
                                <div style="height:24px;width:24px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M267.7 576.9C267.7 576.9 267.7 576.9 267.7 576.9L229.9 603.6C222.6 608.8 213 609.4 205 605.3C197 601.2 192 593 192 584L192 512L160 512C107 512 64 469 64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L359.6 512L267.7 576.9zM332 472.8C340.1 467.1 349.8 464 359.7 464L480 464C506.5 464 528 442.5 528 416L528 192C528 165.5 506.5 144 480 144L160 144C133.5 144 112 165.5 112 192L112 416C112 442.5 133.5 464 160 464L216 464C226.4 464 235.3 470.6 238.6 479.9C239.5 482.4 240 485.1 240 488L240 537.7C272.7 514.6 303.3 493 331.9 472.8z"/></svg>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:2px;">General Feedback</div>
                                    <div style="font-size:12px;color:${styles.panelColor};">Other comments or suggestions</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </fieldset>

                <!-- Priority Selection -->
                <fieldset style="border:none;padding:0;margin:0;">
                    <legend style="font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:12px;padding:0;">Priority Level</legend>
                    <div id="hn_feedback_priorities" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
                        <label class="feedback-priority-option" data-value="low" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_priority" value="low" style="display:none;">
                            <div style="font-weight:600;font-size:14px;color:${styles.panelColor};">Low</div>
                            <div style="font-size:12px;color:${styles.panelColor};">Nice to have</div>
                        </label>
                        
                        <label class="feedback-priority-option" data-value="medium" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_priority" value="medium" style="display:none;" checked>
                            <div style="font-weight:600;font-size:14px;color:${styles.panelColor};">Medium</div>
                            <div style="font-size:12px;color:${styles.panelColor};">Important improvement</div>
                        </label>
                        
                        <label class="feedback-priority-option" data-value="high" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_priority" value="high" style="display:none;">
                            <div style="font-weight:600;font-size:14px;color:${styles.panelColor};">High</div>
                            <div style="font-size:12px;color:${styles.panelColor};">Significant issue</div>
                        </label>
                        <label class="feedback-priority-option" data-value="urgent" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_priority" value="urgent" style="display:none;">
                            <div style="font-weight:600;font-size:14px;color:${styles.panelColor};">Urgent</div>
                            <div style="font-size:12px;color:${styles.panelColor};">Blocking or critical issue</div>
                        </label>
                    </div>
                </fieldset>

                <!-- Title Input -->
                <div>
                    <label style="display:block;font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">
                        Title <span style="color:#ef4444;">*</span>
                    </label>
                    <input type="text" id="hn_feedback_title" maxlength="100" style="width:100%;padding:12px 16px;border:1px solid ${styles.inputBorder};border-radius:8px;background:${styles.panelBackground};color:${styles.panelColor};font-size:14px;outline:none;box-sizing:border-box;" placeholder="Brief summary of your feedback">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <div id="title-error" style="display:none;color:#ef4444;font-size:12px;"></div>
                        <div id="title-counter" style="font-size:12px;color:${styles.panelColor};">0/100</div>
                    </div>
                </div>

                <!-- Description Input -->
                <div>
                    <label style="display:block;font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">
                        Description <span style="color:#ef4444;">*</span>
                    </label>
                    <textarea id="hn_feedback_description" maxlength="1000" rows="4" style="width:100%;padding:12px 16px;border:1px solid ${styles.inputBorder};border-radius:8px;background:${styles.panelBackground};color:${styles.panelColor};font-size:14px;outline:none;resize:vertical;box-sizing:border-box;" placeholder="Please provide detailed information about your feedback"></textarea>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <div id="desc-error" style="display:none;color:#ef4444;font-size:12px;"></div>
                        <div id="desc-counter" style="font-size:12px;color:${styles.panelColor};">0/1000</div>
                    </div>
                </div>

                <!-- File Upload -->
                <div>
                    <label style="display:flex;font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">
                        <div style="height:18px;width:18px;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M305.4 82.4C358.5 29.3 444.6 29.3 497.7 82.4C550.8 135.5 550.8 221.6 497.7 274.7L328 444.5C293.6 478.9 237.9 478.9 203.5 444.5C169.1 410.1 169.1 354.4 203.5 320L362 161.6C371.4 152.2 386.6 152.2 395.9 161.6C405.2 171 405.3 186.2 395.9 195.5L237.5 353.9C221.9 369.5 221.9 394.8 237.5 410.5C253.1 426.2 278.4 426.1 294.1 410.5L463.8 240.8C498.2 206.4 498.2 150.7 463.8 116.3C429.4 81.9 373.7 81.9 339.4 116.3L158.4 297.3C105.3 350.4 105.3 436.5 158.4 489.6C211.5 542.7 297.6 542.7 350.7 489.6L492.1 348.3C501.5 338.9 516.7 338.9 526 348.3C535.3 357.7 535.4 372.9 526 382.2L384.6 523.6C312.7 595.5 196.2 595.5 124.4 523.6C52.6 451.7 52.5 335.2 124.4 263.4L305.4 82.4z"/></svg>
                        </div>&nbsp;&nbsp;
                        Attachments (Optional)
                    </label>
                    <div id="hn_feedback_file_drop" style="border:2px dashed ${styles.inputBorder};border-radius:8px;padding:20px;text-align:center;background:${styles.panelBackground};cursor:pointer;transition:all 0.2s ease;">
                        <div style="height:24px;width:24px;margin-left:auto;margin-right:auto;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M272 96C183.6 96 112 167.6 112 256C112 260.9 112.2 265.8 112.7 270.6C64.9 294 32 343.1 32 400C32 479.5 96.5 544 176 544L480 544C550.7 544 608 486.7 608 416C608 366.1 579.5 323 537.9 301.8C541.9 289.9 544 277.2 544 264C544 197.7 490.3 144 424 144C412.5 144 401.3 145.6 390.7 148.7C361.4 116.4 319.1 96 272 96zM160 256C160 194.1 210.1 144 272 144C309.7 144 343 162.6 363.3 191.1C370 200.6 382.6 203.9 393.1 198.9C402.4 194.5 412.8 192 423.9 192C463.7 192 495.9 224.2 495.9 264C495.9 278.1 491.9 291.2 484.9 302.3C480.8 308.8 480.1 316.9 482.9 324C485.7 331.1 491.9 336.5 499.4 338.3C534.2 347 559.9 378.5 559.9 415.9C559.9 460.1 524.1 495.9 479.9 495.9L175.9 495.9C122.9 495.9 79.9 452.9 79.9 399.9C79.9 357.2 107.8 320.9 146.5 308.5C158.3 304.7 165.3 292.5 162.6 280.4C160.8 272.5 159.9 264.3 159.9 255.9zM337 263C327.6 253.6 312.4 253.6 303.1 263L239.1 327C229.7 336.4 229.7 351.6 239.1 360.9C248.5 370.2 263.7 370.3 273 360.9L296 337.9L296 424C296 437.3 306.7 448 320 448C333.3 448 344 437.3 344 424L344 337.9L367 360.9C376.4 370.3 391.6 370.3 400.9 360.9C410.2 351.5 410.3 336.3 400.9 327L336.9 263z"/></svg>
                        </div>
                        <div style="font-size:14px;color:${styles.panelColor};margin-bottom:4px;">Drop files here or click to browse</div>
                        <div style="font-size:12px;color:${styles.panelColor};">Max 10MB • Images, text files, PDFs</div>
                        <input type="file" id="hn_feedback_file_input" multiple accept="image/*,.txt,.pdf" style="display:none;">
                    </div>
                    <div id="hn_feedback_files_container" style="margin-top:12px;"></div>
                </div>

                <!-- Contact Information -->
                <div>
                    <label style="display:block;font-size:14px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">
                        Contact Method (Optional)
                    </label>
                    <div id="hn_feedback_contact_methods" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                        <label class="feedback-contact-option" data-value="email" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_contact_method" value="email" style="display:none;">
                            <div style="display:flex;font-size:14px;color:${styles.panelColor};">
                                <div style="height:16px;width:16px;margin-right:6px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M125.4 128C91.5 128 64 155.5 64 189.4C64 190.3 64 191.1 64.1 192L64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192L575.9 192C575.9 191.1 576 190.3 576 189.4C576 155.5 548.5 128 514.6 128L125.4 128zM528 256.3L528 448C528 456.8 520.8 464 512 464L128 464C119.2 464 112 456.8 112 448L112 256.3L266.8 373.7C298.2 397.6 341.7 397.6 373.2 373.7L528 256.3zM112 189.4C112 182 118 176 125.4 176L514.6 176C522 176 528 182 528 189.4C528 193.6 526 197.6 522.7 200.1L344.2 335.5C329.9 346.3 310.1 346.3 295.8 335.5L117.3 200.1C114 197.6 112 193.6 112 189.4z"/></svg>
                                </div>
                                <div>
                                    Email
                                </div>
                            </div>
                        </label>
                        
                        <label class="feedback-contact-option" data-value="none" style="cursor:pointer;border:1px solid ${styles.inputBorder};border-radius:8px;padding:8px 12px;transition:all 0.2s ease;background:${styles.panelBackground};text-align:center;">
                            <input type="radio" name="feedback_contact_method" value="none" style="display:none;" checked>
                            <div style="display:flex; font-size:14px;color:${styles.panelColor};">
                                <div style="height:16px;width:16px;margin-right:6px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L513.1 479.4C530.6 476.1 543.9 460.7 543.9 442.3C543.9 435.6 542.1 429 538.8 423.3L517 385.7C498 353.1 488 316.1 488 278.4L488 263.9C488 179.3 425.4 109.2 344 97.6L344 87.9C344 74.6 333.3 63.9 320 63.9C306.7 63.9 296 74.6 296 87.9L296 97.6C253.8 103.6 216.6 125.4 190.6 156.7L73 39.1zM224.8 190.9C246.7 162.4 281.2 144 320 144C386.3 144 440 197.7 440 264L440 278.5C440 324.7 452.3 370 475.5 409.9L488.4 432L465.8 432L224.7 190.9zM164.5 409.9C184 376.5 195.8 339.2 199.1 300.9L152.4 254.2C152.2 257.5 152.1 260.8 152.1 264.1L152.1 278.6C152.1 316.3 142.1 353.3 123.1 385.9L101.1 423.2C97.7 429 96 435.5 96 442.2C96 463.1 112.9 480 133.8 480L378.2 480L330.2 432L151.6 432L164.5 409.9zM252.1 528C262 556 288.7 576 320 576C351.3 576 378 556 387.9 528L252.1 528z"/></svg>
                                </div>
                                <div>
                                    No contact
                                </div>
                            </div>
                        </label>
                    </div>
                    
                    <div id="contact-info-container" style="display:none;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:13px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">Your Name <span style="color:#ef4444;">*</span></label>
                                <input type="text" id="hn_feedback_user_name" style="width:100%;padding:12px 16px;border:1px solid ${styles.inputBorder};border-radius:8px;background:${styles.panelBackground};color:${styles.panelColor};font-size:14px;outline:none;box-sizing:border-box;" placeholder="John Doe">
                            </div>
                            <div>
                                <label style="display:block;font-size:13px;font-weight:500;color:${styles.panelColor};margin-bottom:6px;">Email Address <span style="color:#ef4444;">*</span></label>
                                <input type="email" id="hn_feedback_contact_info" style="width:100%;padding:12px 16px;border:1px solid ${styles.inputBorder};border-radius:8px;background:${styles.panelBackground};color:${styles.panelColor};font-size:14px;outline:none;box-sizing:border-box;" placeholder="your.email@example.com">
                            </div>
                        </div>
                        <div id="contact-error" style="display:none;color:#ef4444;font-size:12px;margin-top:4px;"></div>
                        <div id="name-error" style="display:none;color:#ef4444;font-size:12px;margin-top:4px;"></div>
                    </div>
                </div>

                <!-- Submit Button -->
                <button type="submit" style="background:${styles.buttonBackground};color:${styles.buttonColor};border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:opacity 0.2s ease;">
                    Submit Feedback
                </button>
            </form>
        `;

        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        backdrop.appendChild(modal);

        return backdrop;
    }

    function setupFeedbackModalEvents() {
        // Character counters
        const titleInput = document.getElementById('hn_feedback_title');
        const descInput = document.getElementById('hn_feedback_description');
        const titleCounter = document.getElementById('title-counter');
        const descCounter = document.getElementById('desc-counter');

        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                titleCounter.textContent = `${titleInput.value.length}/100`;
            });
        }

        if (descInput && descCounter) {
            descInput.addEventListener('input', () => {
                descCounter.textContent = `${descInput.value.length}/1000`;
            });
        }

        // Card selection behaviors
        function setupCardSelection(containerSelector, optionSelector) {
            const options = document.querySelectorAll(`${containerSelector} ${optionSelector}`);
            options.forEach(option => {
                option.addEventListener('click', () => {
                    // Remove active state from all options
                    options.forEach(opt => {
                        opt.style.borderColor = styles.inputBorder;
                        opt.style.background = styles.panelBackground;
                    });

                    // Add active state to clicked option
                    option.style.borderColor = styles.inputBorder;
                    option.style.background = styles.primaryColor + '16';

                    // Check the radio button
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;

                    // Show/hide contact info for contact method
                    if (containerSelector === '#hn_feedback_contact_methods') {
                        const contactContainer = document.getElementById('contact-info-container');
                        if (contactContainer) {
                            contactContainer.style.display = option.dataset.value === 'email' ? 'block' : 'none';
                        }
                    }
                });
            });
        }

        setupCardSelection('#hn_feedback_types', '.feedback-type-option');
        setupCardSelection('#hn_feedback_priorities', '.feedback-priority-option');
        setupCardSelection('#hn_feedback_contact_methods', '.feedback-contact-option');

        // Set default selection for medium priority
        const mediumPriority = document.querySelector('.feedback-priority-option[data-value="medium"]');
        if (mediumPriority) {
            mediumPriority.style.borderColor = styles.primaryColor;
            mediumPriority.style.background = styles.primaryColor + '16';
        }

        // File upload handling
        const fileInput = document.getElementById('hn_feedback_file_input');
        const fileDropZone = document.getElementById('hn_feedback_file_drop');

        if (fileInput && fileDropZone) {
            fileDropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => addFiles(e.target.files));

            // Drag and drop
            fileDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileDropZone.style.borderColor = styles.primaryColor;
                fileDropZone.style.background = styles.primaryColor + '16';
            });

            fileDropZone.addEventListener('dragleave', () => {
                fileDropZone.style.borderColor = styles.inputBorder;
                fileDropZone.style.background = styles.inputBackground;
            });

            fileDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileDropZone.style.borderColor = styles.inputBorder;
                fileDropZone.style.background = styles.inputBackground;
                addFiles(e.dataTransfer.files);
            });
        }

        // Form submission
        const form = document.getElementById('hn_feedback_form');
        if (form) {
            form.addEventListener('submit', submitFeedback);
        }
    }

    function validateForm() {
        const errors = {};
        const title = document.getElementById('hn_feedback_title').value.trim();
        const description = document.getElementById('hn_feedback_description').value.trim();
        const contactMethod = document.querySelector('input[name="feedback_contact_method"]:checked')?.value;
        const contactInfo = document.getElementById('hn_feedback_contact_info')?.value.trim();
        const userName = document.getElementById('hn_feedback_user_name')?.value.trim();

        // Clear previous errors
        document.getElementById('title-error').style.display = 'none';
        document.getElementById('desc-error').style.display = 'none';
        document.getElementById('contact-error').style.display = 'none';
        document.getElementById('name-error').style.display = 'none';

        // Reset field styles
        document.getElementById('hn_feedback_title').style.borderColor = styles.inputBorder;
        document.getElementById('hn_feedback_description').style.borderColor = styles.inputBorder;
        const contactInput = document.getElementById('hn_feedback_contact_info');
        if (contactInput) contactInput.style.borderColor = styles.inputBorder;
        const nameInput = document.getElementById('hn_feedback_user_name');
        if (nameInput) nameInput.style.borderColor = styles.inputBorder;

        // Validation
        if (!title) { errors.title = 'Title is required'; }
        if (!description) { errors.description = 'Description is required'; }
        if (contactMethod === 'email') {
            if (!userName) {
                errors.name = 'Name is required when requesting email contact';
            }
            if (!contactInfo || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contactInfo)) {
                errors.contact = 'Valid email address is required';
            }
        }

        // Display errors
        if (errors.title) {
            document.getElementById('title-error').textContent = '⚠️ ' + errors.title;
            document.getElementById('title-error').style.display = 'block';
            document.getElementById('hn_feedback_title').style.borderColor = '#ef4444';
        }
        if (errors.description) {
            document.getElementById('desc-error').textContent = '⚠️ ' + errors.description;
            document.getElementById('desc-error').style.display = 'block';
            document.getElementById('hn_feedback_description').style.borderColor = '#ef4444';
        }
        if (errors.contact) {
            document.getElementById('contact-error').textContent = '⚠️ ' + errors.contact;
            document.getElementById('contact-error').style.display = 'block';
            const contactInput = document.getElementById('hn_feedback_contact_info');
            if (contactInput) contactInput.style.borderColor = '#ef4444';
        }
        if (errors.name) {
            document.getElementById('name-error').textContent = '⚠️ ' + errors.name;
            document.getElementById('name-error').style.display = 'block';
            const nameInput = document.getElementById('hn_feedback_user_name');
            if (nameInput) nameInput.style.borderColor = '#ef4444';
        }

        return Object.keys(errors).length === 0;
    }

    async function submitFeedback(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = {
            type: document.querySelector('input[name="feedback_type"]:checked')?.value || 'general',
            priority: document.querySelector('input[name="feedback_priority"]:checked')?.value || 'medium',
            title: document.getElementById('hn_feedback_title').value.trim(),
            description: document.getElementById('hn_feedback_description').value.trim(),
            contactMethod: document.querySelector('input[name="feedback_contact_method"]:checked')?.value || 'none',
            userEmail: document.getElementById('hn_feedback_contact_info')?.value.trim() || '',
            userName: document.getElementById('hn_feedback_user_name')?.value.trim() || '',
            tenantId: tenantId,
            sessionId: sessionId,
            siteId: siteId || config.siteId || '',
            attachments: selectedFiles.map(file => ({ name: file.name, size: file.size, type: file.type }))
        };

        try {
            // Submit feedback
            const response = await fetch(`${baseOrigin}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            const result = await response.json();
            const feedbackId = result.id || result.feedbackId;

            // Upload attachments if any
            if (selectedFiles.length > 0 && feedbackId) {
                const attachmentFormData = new FormData();
                attachmentFormData.append('feedbackId', feedbackId);
                attachmentFormData.append('tenantId', tenantId);

                selectedFiles.forEach(file => {
                    attachmentFormData.append('files', file);
                });

                const attachmentResponse = await fetch(`${baseOrigin}/api/feedback/attachments`, {
                    method: 'POST',
                    body: attachmentFormData
                });

                if (!attachmentResponse.ok) {
                    console.warn('Failed to upload attachments, but feedback was submitted');
                }
            }

            // Success message
            alert('Thank you for your feedback! We appreciate you taking the time to help us improve.');
            closeFeedbackModal();

        } catch (error) {
            console.error('Feedback submission error:', error);
            alert('Sorry, there was an error submitting your feedback. Please try again.');
        }
    }

    function openFeedbackModal() {
        if (feedbackModal) {
            feedbackModal.remove();
        }

        feedbackModal = createFeedbackModal();
        document.body.appendChild(feedbackModal);

        // Setup event listeners after modal is in DOM
        setTimeout(setupFeedbackModalEvents, 10);

        // Close on backdrop click
        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                closeFeedbackModal();
            }
        });
    }

    function closeFeedbackModal() {
        if (feedbackModal) {
            feedbackModal.remove();
            feedbackModal = null;
        }

        // Reset form state
        selectedFiles = [];
    }
}

// Make mountChatWidget available globally for the main widget to use
window.mountChatWidget = mountChatWidget;
