/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { calculateMinesPositions } from './mines.ts';

// Define SVG icons as strings
const starIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>`;

const gemIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 3h12l4 6-10 12L2 9l4-6z"></path>
    <path d="M2 9h20"></path>
</svg>`;

const bombIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M15.5 15.5 19 19"></path>
    <path d="m13.5 8.5-1 1 2 2-1 1-2-2-1 1 2 2-1 1"></path>
</svg>`;

const backArrowIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;
const saveIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path></svg>`;
const shareIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 8.81C7.5 8.31 6.79 8 6 8c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"></path></svg>`;
const expandIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>`;
const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg>`;


/**
 * Generates a cryptographically secure 64-character random hex string.
 * @returns {string} A 64-character hex string.
 */
function generateNewSeed(): string {
    const array = new Uint8Array(32); // 32 bytes = 64 hex characters
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculates the SHA-256 hash of a string.
 * @param {string} message The string to hash.
 * @returns {Promise<string>} A promise that resolves to the hex-encoded hash.
 */
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

type SavedRound = { mines: number; nonce: number; selectedTiles: number[] };

/**
 * Loads saved rounds from localStorage.
 * @returns {SavedRound[]} An array of saved rounds.
 */
function loadSavedRounds(): SavedRound[] {
    const roundsJSON = localStorage.getItem('savedRounds');
    if (roundsJSON) {
        try {
            return JSON.parse(roundsJSON);
        } catch (e) {
            console.error('Error parsing saved rounds from localStorage', e);
            return [];
        }
    }
    return [];
}

/**
 * Persists saved rounds to localStorage.
 * @param {SavedRound[]} rounds The array of rounds to save.
 */
function persistSavedRounds(rounds: SavedRound[]) {
    localStorage.setItem('savedRounds', JSON.stringify(rounds));
}


/**
 * Renders the entire application into a given root element.
 * @param {HTMLElement} rootElement The container element for the app.
 */
function renderApp(rootElement: HTMLElement) {
    rootElement.innerHTML = ''; // Clear previous content

    // Create header
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
        <button class="icon-btn" aria-label="Go back">${backArrowIcon}</button>
        <h1 class="app-title">Grid Mapper</h1>
        <div class="header-actions">
            <button class="icon-btn" aria-label="Save">${saveIcon}</button>
            <button class="icon-btn" aria-label="Share">${shareIcon}</button>
        </div>
    `;
    rootElement.appendChild(header);

    const shareButton = header.querySelector('[aria-label="Share"]') as HTMLButtonElement | null;
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            const JSZip = (window as any).JSZip;
            if (!JSZip) {
                console.error('JSZip library not found. Please check the network connection.');
                alert('Error: Could not load library to create zip file.');
                return;
            }

            const spinnerIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>';
            const originalIcon = shareButton.innerHTML;
            shareButton.innerHTML = spinnerIcon;
            shareButton.disabled = true;

            try {
                const fileNames = ['index.html', 'index.css', 'index.tsx', 'provably-fair.ts', 'mines.ts', 'metadata.json'];
                const filePromises = fileNames.map(name =>
                    fetch(name).then(res => {
                        if (!res.ok) throw new Error(`Failed to fetch ${name}`);
                        return res.text();
                    })
                );

                const fileContents = await Promise.all(filePromises);

                const zip = new JSZip();
                fileNames.forEach((name, index) => {
                    zip.file(name, fileContents[index]);
                });

                const blob = await zip.generateAsync({ type: 'blob' });

                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'grid-mapper-project.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

            } catch (error) {
                console.error('Failed to create or download zip file:', error);
                alert('An error occurred while creating the project zip file.');
            } finally {
                shareButton.innerHTML = originalIcon;
                shareButton.disabled = false;
            }
        });
    }
    
    // Create main content area
    const main = document.createElement('main');
    rootElement.appendChild(main);
    
    const appContainer = document.createElement('div');
    appContainer.className = 'app-container';
    main.appendChild(appContainer);


    let verified = false;
    let isSearching = false;
    const savedRounds: SavedRound[] = loadSavedRounds();
    const lastClientSeed = localStorage.getItem('clientSeed') || 'xproject';
    const lastNonce = localStorage.getItem('nonce') || '1';
    const lastMatchedSeed = localStorage.getItem('lastMatchedSeed') || '';

    const selectedCells = new Set<number>();

    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';

    // Log box
    const logBox = document.createElement('div');
    logBox.className = 'log-box';
    logBox.setAttribute('role', 'log');
    logBox.setAttribute('aria-live', 'polite');
    
    const logActions = document.createElement('div');
    logActions.className = 'log-actions';
    const expandBtn = document.createElement('button');
    expandBtn.className = 'icon-btn small';
    expandBtn.innerHTML = expandIcon;
    expandBtn.setAttribute('aria-label', 'Expand log');
    const resetBtn = document.createElement('button');
    resetBtn.className = 'icon-btn small';
    resetBtn.innerHTML = resetIcon;
    resetBtn.setAttribute('aria-label', 'Reset selection');
    logActions.append(expandBtn, resetBtn);

    logContainer.append(logBox, logActions);
    appContainer.appendChild(logContainer);


    function updateLog() {
        logBox.innerHTML = ''; // Clear previous log content

        const selectedCellNumbers = Array.from(selectedCells)
            .sort((a, b) => a - b);
        
        const selectionEntry = document.createElement('p');
        selectionEntry.textContent = `> Selected: [${selectedCellNumbers.join(', ')}]`;
        logBox.appendChild(selectionEntry);
        logBox.scrollTop = logBox.scrollHeight;
    }

    const createInputGroup = (id: string, labelText: string, placeholder: string, defaultValue?: string, type = 'text', readOnly = false): { group: HTMLDivElement, input: HTMLInputElement } => {
        const group = document.createElement('div');
        group.className = 'input-group';
        const label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.placeholder = placeholder;
        if (defaultValue) input.value = defaultValue;
        if (readOnly) input.readOnly = true;
        group.appendChild(label);
        group.appendChild(input);
        return { group, input };
    };

    const grid = document.createElement('div');
    grid.className = 'grid';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerHTML = starIcon;
        cell.addEventListener('click', () => {
            if (verified) {
                verified = false;
                selectedCells.clear();
                grid.querySelectorAll('.cell').forEach(c => {
                    c.classList.remove('hit', 'miss', 'highlighted');
                    c.innerHTML = starIcon;
                });
                updateLog();
                return;
            }

            if (selectedCells.has(i)) {
                selectedCells.delete(i);
                cell.classList.remove('highlighted');
            } else {
                selectedCells.add(i);
                cell.classList.add('highlighted');
            }

            if (selectedCells.size === 0) {
                grid.querySelectorAll('.cell.highlighted').forEach(c => {
                    c.classList.remove('highlighted');
                });
            }
            updateLog();
        });
        grid.appendChild(cell);
    }
    appContainer.appendChild(grid);

    resetBtn.addEventListener('click', () => {
        verified = false;
        selectedCells.clear();
        grid.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('hit', 'miss', 'highlighted');
            c.innerHTML = starIcon;
        });
        updateLog();
    });

    function revealBoard(minePositions: number[]) {
        grid.querySelectorAll('.cell').forEach((cell, index) => {
            cell.classList.remove('highlighted');
            const isMine = minePositions.includes(index);
            const isSelected = selectedCells.has(index);
            cell.innerHTML = isMine ? bombIcon : gemIcon;
            if (isSelected) cell.classList.add(isMine ? 'hit' : 'miss');
        });
    }

    async function runMatch(clientSeed: string, serverSeed: string, nonce: number, mines: number) {
        verified = true;
        const minePositions = await calculateMinesPositions({ serverSeed, clientSeed, nonce, mines });
        const resultEntry = document.createElement('p');
        resultEntry.textContent = `> Match Results. Mines at: [${minePositions.join(', ')}]`;
        logBox.appendChild(resultEntry);
        logBox.scrollTop = logBox.scrollHeight;
        revealBoard(minePositions);
    }

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    const tabSwitcher = document.createElement('div');
    tabSwitcher.className = 'tab-switcher';

    const verifyTabBtn = document.createElement('button');
    verifyTabBtn.className = 'tab-btn active';
    verifyTabBtn.textContent = 'Verify';
    verifyTabBtn.setAttribute('role', 'tab');
    verifyTabBtn.setAttribute('aria-selected', 'true');
    
    const seedMatchTabBtn = document.createElement('button');
    seedMatchTabBtn.className = 'tab-btn';
    seedMatchTabBtn.textContent = 'Seed Match';
    seedMatchTabBtn.setAttribute('role', 'tab');
    seedMatchTabBtn.setAttribute('aria-selected', 'false');

    const savedRoundsTabBtn = document.createElement('button');
    savedRoundsTabBtn.className = 'tab-btn';
    savedRoundsTabBtn.textContent = 'Saved Rounds';
    savedRoundsTabBtn.setAttribute('role', 'tab');
    savedRoundsTabBtn.setAttribute('aria-selected', 'false');

    tabSwitcher.append(verifyTabBtn, seedMatchTabBtn, savedRoundsTabBtn);
    
    const sharedInputsContainer = document.createElement('div');
    sharedInputsContainer.className = 'inputs-container';
    const { group: clientSeedGroup, input: clientSeedInput } = createInputGroup('client-seed', 'Client Seed', 'xproject', lastClientSeed);
    const { group: nonceGroup, input: nonceInput } = createInputGroup('nonce', 'Nonce', '1', lastNonce, 'number');
    
    clientSeedInput.addEventListener('input', () => localStorage.setItem('clientSeed', clientSeedInput.value));
    nonceInput.addEventListener('input', () => localStorage.setItem('nonce', nonceInput.value));

    sharedInputsContainer.append(clientSeedGroup, nonceGroup);

    const tabPanels = document.createElement('div');
    tabPanels.className = 'tab-panels';

    const verifyPanel = document.createElement('div');
    verifyPanel.className = 'tab-panel';
    verifyPanel.setAttribute('role', 'tabpanel');

    const seedMatchPanel = document.createElement('div');
    seedMatchPanel.className = 'tab-panel hidden';
    seedMatchPanel.setAttribute('role', 'tabpanel');

    const savedRoundsPanel = document.createElement('div');
    savedRoundsPanel.className = 'tab-panel hidden';
    savedRoundsPanel.setAttribute('role', 'tabpanel');

    const savedRoundsList = document.createElement('div');
    savedRoundsList.id = 'saved-rounds-list';

    tabPanels.append(verifyPanel, seedMatchPanel, savedRoundsPanel);
    controlsContainer.append(tabSwitcher, sharedInputsContainer, tabPanels);

    const { group: serverSeedGroup, input: serverSeedInput } = createInputGroup('server-seed', 'Server Seed', 'Enter server seed', lastMatchedSeed);
    const { group: serverSeedHashedGroup, input: serverSeedHashedInput } = createInputGroup('server-seed-hashed', 'Server Seed (Hashed)', 'SHA-256 hash of the server seed', '', 'text', true);
    const { group: minesGroup, input: minesInput } = createInputGroup('mines', 'Mines', 'Number of mines', '3', 'number');
    
    if (lastMatchedSeed) {
        sha256(lastMatchedSeed).then(hash => {
            serverSeedHashedInput.value = hash;
        });
    }
    
    serverSeedInput.addEventListener('input', async (event) => {
        const inputElement = event.target as HTMLInputElement;
        const newSeed = inputElement.value;
        serverSeedHashedInput.value = newSeed ? await sha256(newSeed) : '';
    });

    const verifyInputsContainer = document.createElement('div');
    verifyInputsContainer.className = 'inputs-container';
    verifyInputsContainer.append(serverSeedGroup, serverSeedHashedGroup, minesGroup);
    
    const verifyButtonsContainer = document.createElement('div');
    verifyButtonsContainer.className = 'buttons-container';

    const generateSeedButton = document.createElement('button');
    generateSeedButton.className = 'btn btn-secondary';
    generateSeedButton.textContent = 'Generate Seed';
    generateSeedButton.addEventListener('click', async () => {
        const newSeed = generateNewSeed();
        serverSeedInput.value = newSeed;
        serverSeedHashedInput.value = await sha256(newSeed);
    });

    const verifyMatchButton = document.createElement('button');
    verifyMatchButton.className = 'btn btn-primary';
    verifyMatchButton.textContent = 'Verify';
    verifyMatchButton.addEventListener('click', async () => {
        const clientSeed = clientSeedInput.value;
        const serverSeed = serverSeedInput.value;
        const nonce = parseInt(nonceInput.value, 10);
        const mines = parseInt(minesInput.value, 10);
        if (!clientSeed || !serverSeed || isNaN(nonce) || isNaN(mines) || mines < 0 || mines > 25) {
            const errorEntry = document.createElement('p');
            errorEntry.textContent = `> Error: Please fill all fields correctly. Mines must be between 0 and 25.`;
            logBox.appendChild(errorEntry);
            return;
        }
        await runMatch(clientSeed, serverSeed, nonce, mines);
    });
    
    verifyButtonsContainer.append(generateSeedButton, verifyMatchButton);
    verifyPanel.append(verifyInputsContainer, verifyButtonsContainer);

    const seedMatchDescription = document.createElement('p');
    seedMatchDescription.className = 'panel-description';
    
    const seedMatchButtonsContainer = document.createElement('div');
    seedMatchButtonsContainer.className = 'buttons-container';

    const saveButton = document.createElement('button');
    const findMatchButton = document.createElement('button');
    findMatchButton.className = 'btn btn-primary';
    findMatchButton.textContent = 'Find Match';

    function updateSavedRoundsView() {
        savedRoundsList.innerHTML = '';
        if (savedRounds.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No rounds have been saved yet.';
            savedRoundsList.appendChild(emptyMessage);
        } else {
            savedRounds.forEach((round, index) => {
                const roundItem = document.createElement('div');
                roundItem.className = 'saved-round-item';
                roundItem.innerHTML = `
                    <div style="position: relative; z-index: 1;">
                        <p><strong>Round ${savedRounds.length - index}</strong></p>
                        <p>Nonce: ${round.nonce}</p>
                        <p>Mines: ${round.mines}</p>
                        <p>Selected Tiles: [${round.selectedTiles.join(', ')}]</p>
                    </div>
                `;

                let pressTimer: number;
                const startPress = (e: Event) => {
                    e.preventDefault();
                    roundItem.classList.add('deleting');
                    pressTimer = window.setTimeout(() => {
                        savedRounds.splice(index, 1);
                        persistSavedRounds(savedRounds);
                        updateSavedRoundsView();
                        updateSeedMatchPanel();
                        
                        const currentNonce = parseInt(nonceInput.value, 10);
                        if (!isNaN(currentNonce) && currentNonce > 1) {
                            nonceInput.value = (currentNonce - 1).toString();
                        }

                        const logEntry = document.createElement('p');
                        logEntry.textContent = `> Round deleted. Nonce decremented.`;
                        logBox.appendChild(logEntry);
                        logBox.scrollTop = logBox.scrollHeight;
                    }, 5000);
                };

                const cancelPress = () => {
                    clearTimeout(pressTimer);
                    roundItem.classList.remove('deleting');
                };

                roundItem.addEventListener('mousedown', startPress);
                roundItem.addEventListener('mouseup', cancelPress);
                roundItem.addEventListener('mouseleave', cancelPress);
                roundItem.addEventListener('touchstart', startPress, { passive: true });
                roundItem.addEventListener('touchend', cancelPress);
                roundItem.addEventListener('touchcancel', cancelPress);

                savedRoundsList.appendChild(roundItem);
            });
        }
    }

    function updateSeedMatchPanel() {
        if (savedRounds.length > 0) {
            seedMatchDescription.textContent = `Find a single server seed that satisfies all ${savedRounds.length} of your saved round(s).`;
        } else {
            seedMatchDescription.textContent = 'Select tiles on the grid, then find a server seed that produces that exact layout.';
        }
    }

    function setActiveTab(activeBtn: HTMLButtonElement) {
        const buttons = [verifyTabBtn, seedMatchTabBtn, savedRoundsTabBtn];
        const panels = [verifyPanel, seedMatchPanel, savedRoundsPanel];
        
        buttons.forEach((btn, index) => {
            if (btn === activeBtn) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                panels[index].classList.remove('hidden');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
                panels[index].classList.add('hidden');
            }
        });

        if (activeBtn === seedMatchTabBtn) {
            updateSeedMatchPanel();
        }
    }

    verifyTabBtn.addEventListener('click', () => setActiveTab(verifyTabBtn));
    seedMatchTabBtn.addEventListener('click', () => setActiveTab(seedMatchTabBtn));
    savedRoundsTabBtn.addEventListener('click', () => {
        setActiveTab(savedRoundsTabBtn);
        updateSavedRoundsView();
    });

    function showMatchResult(serverSeed: string, mineIndices: number[], customMessage?: string) {
        localStorage.setItem('lastMatchedSeed', serverSeed);
        seedMatchDescription.classList.add('hidden');
        seedMatchButtonsContainer.classList.add('hidden');

        const resultView = document.createElement('div');
        resultView.className = 'result-view';
        resultView.innerHTML = `
            <h2>Match Found!</h2>
            <p>${customMessage || 'The following server seed produces the selected mine layout:'}</p>
            <div class="seed-display">${serverSeed}</div>
            ${mineIndices.length > 0 ? `<p>Mine Indices: <strong>[${mineIndices.sort((a,b) => a - b).join(', ')}]</strong></p>` : ''}
        `;

        const resultButtons = document.createElement('div');
        resultButtons.className = 'buttons-container';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary';
        copyBtn.textContent = 'Copy Seed';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(serverSeed);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Seed'; }, 1500);
        });

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', () => {
            resultView.remove();
            seedMatchDescription.classList.remove('hidden');
            seedMatchButtonsContainer.classList.remove('hidden');
        });

        resultButtons.append(copyBtn, closeBtn);
        resultView.appendChild(resultButtons);
        seedMatchPanel.appendChild(resultView);
    }
    
    findMatchButton.addEventListener('click', async () => {
        if (isSearching) {
            isSearching = false; // This will stop the search loop
            return;
        }

        const clientSeed = clientSeedInput.value;
        if (!clientSeed) {
            const errorEntry = document.createElement('p');
            errorEntry.textContent = `> Error: Please fill the Client Seed field.`;
            logBox.appendChild(errorEntry);
            logBox.scrollTop = logBox.scrollHeight;
            return;
        }

        isSearching = true;
        const controlsToDisable = [clientSeedInput, nonceInput, saveButton, verifyTabBtn, savedRoundsTabBtn];
        findMatchButton.textContent = 'Cancel';
        controlsToDisable.forEach(c => c.disabled = true);

        const logEntry = document.createElement('p');
        let iterations = 0;

        try {
            if (savedRounds.length > 0) {
                // Multi-round match logic
                logEntry.textContent = `> Starting search for a seed to match all ${savedRounds.length} saved rounds...`;
                logBox.appendChild(logEntry);
                logBox.scrollTop = logBox.scrollHeight;

                while (isSearching) {
                    iterations++;
                    const newServerSeed = generateNewSeed();
                    let allRoundsMatch = true;

                    for (const round of savedRounds) {
                        const minePositions = await calculateMinesPositions({
                            serverSeed: newServerSeed,
                            clientSeed,
                            nonce: round.nonce,
                            mines: round.mines
                        });
                        const isMatch = round.selectedTiles.length === minePositions.length && round.selectedTiles.every((val, index) => val === minePositions[index]);
                        if (!isMatch) {
                            allRoundsMatch = false;
                            break;
                        }
                    }

                    if (allRoundsMatch) {
                        isSearching = false;
                        const successEntry = document.createElement('p');
                        successEntry.textContent = `> Match found after ${iterations} attempts!`;
                        logBox.appendChild(successEntry);
                        showMatchResult(newServerSeed, [], `This seed satisfies all ${savedRounds.length} saved rounds.`);
                        break;
                    }

                    if (iterations % 500 === 0) {
                        logEntry.textContent = `> Searching... (attempts: ${iterations})`;
                        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
                    }
                }
            } else {
                // Single-round match logic (original behavior)
                const nonce = parseInt(nonceInput.value, 10);
                const mines = selectedCells.size;
                
                if (mines === 0) {
                    isSearching = false; // Stop before starting
                    const errorEntry = document.createElement('p');
                    errorEntry.textContent = `> Error: Select tiles on the grid to find a matching seed.`;
                    logBox.appendChild(errorEntry);
                    // No need to return here, the finally block will handle cleanup
                } else if (isNaN(nonce)) {
                    isSearching = false; // Stop before starting
                    const errorEntry = document.createElement('p');
                    errorEntry.textContent = `> Error: Please fill the Nonce field.`;
                    logBox.appendChild(errorEntry);
                } else {
                     logEntry.textContent = '> Starting search...';
                    logBox.appendChild(logEntry);
                    logBox.scrollTop = logBox.scrollHeight;
                    const selectedPositions = Array.from(selectedCells).sort((a, b) => a - b);

                    while(isSearching) {
                        iterations++;
                        const newServerSeed = generateNewSeed();
                        const minePositions = await calculateMinesPositions({ serverSeed: newServerSeed, clientSeed, nonce, mines });
                        const isMatch = selectedPositions.length === minePositions.length && selectedPositions.every((val, index) => val === minePositions[index]);
                        
                        if (isMatch) {
                            isSearching = false;
                            const successEntry = document.createElement('p');
                            successEntry.textContent = `> Match found after ${iterations} attempts!`;
                            logBox.appendChild(successEntry);
                            showMatchResult(newServerSeed, minePositions);
                            break;
                        }
                        if (iterations % 500 === 0) {
                            logEntry.textContent = `> Searching... (attempts: ${iterations})`;
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                }
            }
        } finally {
            if (isSearching === false && findMatchButton.textContent === 'Cancel') { // This means search finished, not was cancelled before start
                 if (iterations > 0) {
                    const cancelEntry = document.createElement('p');
                    cancelEntry.textContent = `> Search canceled after ${iterations} attempts.`;
                    logBox.appendChild(cancelEntry);
                }
            }
            isSearching = false;
            findMatchButton.textContent = 'Find Match';
            controlsToDisable.forEach(c => c.disabled = false);
            logBox.scrollTop = logBox.scrollHeight;
        }
    });
    
    saveButton.className = 'btn btn-secondary';
    saveButton.textContent = 'Save Round';
    saveButton.addEventListener('click', () => {
        const nonce = parseInt(nonceInput.value, 10);
        const mines = selectedCells.size;
        if (mines === 0) {
            const errorEntry = document.createElement('p');
            errorEntry.textContent = `> Error: Select at least one tile to save a round.`;
            logBox.appendChild(errorEntry);
            logBox.scrollTop = logBox.scrollHeight;
            return;
        }
        const selectedTiles = Array.from(selectedCells).sort((a,b) => a - b);
        savedRounds.unshift({ mines, nonce, selectedTiles });
        persistSavedRounds(savedRounds);
        
        nonceInput.value = (nonce + 1).toString();
        nonceInput.dispatchEvent(new Event('input'));

        selectedCells.clear();
        grid.querySelectorAll('.cell.highlighted').forEach(c => c.classList.remove('highlighted'));
        updateLog();

        const logEntry = document.createElement('p');
        logEntry.textContent = `> Round saved (Mines: ${mines}, Nonce: ${nonce}). Nonce incremented. Tiles cleared.`;
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
        
        updateSavedRoundsView();
        updateSeedMatchPanel();
    });

    seedMatchButtonsContainer.append(findMatchButton);
    seedMatchPanel.append(seedMatchDescription, seedMatchButtonsContainer);

    const savedRoundsActions = document.createElement('div');
    savedRoundsActions.className = 'buttons-container';
    savedRoundsActions.appendChild(saveButton);
    savedRoundsPanel.append(savedRoundsActions, savedRoundsList);

    appContainer.appendChild(controlsContainer);
    updateLog();
    updateSeedMatchPanel();
    updateSavedRoundsView();
}

const root = document.getElementById('root');
if (root) renderApp(root);
else console.error('Root element not found');