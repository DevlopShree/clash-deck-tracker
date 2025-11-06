class DeckTracker {
    constructor() {
        this.cards = {};
        this.deck = Array(8).fill(null); // 8 card slots, initially empty
        this.history = []; // For undo functionality
        this.selectedElixir = null;
        this.recognition = null;
        this.isListening = false;
        this.cardNames = []; // Will be populated after loading cards

        this.loadCards();
        this.initializeEventListeners();
        this.initializeVoiceRecognition();
    }

    async loadCards() {
        try {
            const response = await fetch('cards.json');
            this.cards = await response.json();

            // Create a flat array of all card names for voice recognition
            this.cardNames = [];
            Object.values(this.cards).forEach(elixirCards => {
                elixirCards.forEach(card => {
                    this.cardNames.push(card.name.toLowerCase());
                });
            });
        } catch (error) {
            console.error('Failed to load cards:', error);
        }
    }

    initializeEventListeners() {
        // Elixir button listeners
        document.querySelectorAll('.elixir-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const elixir = e.target.dataset.elixir;
                this.selectElixir(elixir);
            });
        });

        // Undo button
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });

        // Evolution star drag and drop
        this.initializeEvoDragDrop();

        // Card slot click listeners (for cycling cards)
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const position = parseInt(e.currentTarget.dataset.position);
                if (this.deck[position]) {
                    this.cycleCard(position);
                }
            });
        });

        // Voice button listener
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.toggleVoiceRecognition();
        });
    }

    selectElixir(elixir) {
        // Save current state for undo
        this.saveState();

        // Update UI
        document.querySelectorAll('.elixir-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600');
            btn.classList.add('bg-purple-600');
        });

        const selectedBtn = document.querySelector(`[data-elixir="${elixir}"]`);
        selectedBtn.classList.remove('bg-purple-600');
        selectedBtn.classList.add('bg-blue-600');

        this.selectedElixir = elixir;
        this.showCardSelection(elixir);
    }

    showCardSelection(elixir) {
        const cardSelection = document.getElementById('cardSelection');
        const cardList = document.getElementById('cardList');

        cardList.innerHTML = '';

        if (this.cards[elixir]) {
            // Sort cards alphabetically
            const sortedCards = [...this.cards[elixir]].sort((a, b) => a.name.localeCompare(b.name));

            sortedCards.forEach(card => {
                const cardBtn = document.createElement('button');
                cardBtn.className = 'card-button hover:scale-105 transition-transform duration-200 flex flex-col items-center';
                
                const img = document.createElement('img');
                img.src = card.image;
                img.alt = card.name;
                img.className = 'w-16 h-20 object-cover rounded shadow-lg border-2 border-gray-300 hover:border-blue-400';
                img.onerror = function() {
                    this.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-16 h-20 bg-gray-600 rounded flex items-center justify-center text-xs text-white text-center p-1';
                    fallback.textContent = card.name;
                    cardBtn.appendChild(fallback);
                };
                
                cardBtn.appendChild(img);
                
                cardBtn.addEventListener('click', () => {
                    this.selectCard(card);
                });
                cardList.appendChild(cardBtn);
            });
        }

        cardSelection.classList.remove('hidden');
    }

    selectCard(card) {
        // Save current state for undo
        this.saveState();

        // Check if card is already in deck
        const existingIndex = this.deck.findIndex(deckCard =>
            deckCard && deckCard.name === card.name
        );

        if (existingIndex !== -1) {
            // Card exists, move it to position 7 (last position)
            this.cycleCard(existingIndex);
        } else {
            // New card, add to position 7 (last position)
            // Shift all cards forward by removing the first card and adding new card at the end
            this.deck.shift(); // Remove first card
            this.deck.push({ ...card, isEvo: false }); // Add new card at the end
        }

        this.updateDeckDisplay();
        this.hideCardSelection();
    }

    cycleCard(position) {
        if (!this.deck[position]) return;

        // Save current state for undo
        this.saveState();

        // Get the card at the position
        const card = this.deck[position];

        // Remove card from current position
        this.deck.splice(position, 1);

        // Add card to the end (position 7)
        this.deck.push(card);

        // Ensure deck stays at 8 cards
        if (this.deck.length > 8) {
            this.deck = this.deck.slice(-8);
        }

        this.updateDeckDisplay();
    }

    updateDeckDisplay() {
        document.querySelectorAll('.card-slot').forEach((slot, index) => {
            const card = this.deck[index];

            if (card) {
                slot.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full relative">
                        <img src="${card.image}" alt="${card.name}" class="w-full h-full object-cover rounded border border-gray-400" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="w-full h-full bg-gray-600 rounded flex items-center justify-center text-xs text-white text-center p-1" style="display: none;">${card.name}</div>
                        ${card.isEvo ? '<span class="evo-star">⭐</span>' : ''}
                    </div>
                `;
                slot.classList.remove('bg-gray-800', 'border-gray-600');
                slot.classList.add('bg-transparent', 'border-transparent');
            } else {
                slot.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-gray-400 text-xs">Unknown</span></div>';
                slot.classList.remove('bg-transparent', 'border-transparent');
                slot.classList.add('bg-gray-800', 'border-gray-600');
            }
        });
    }

    hideCardSelection() {
        document.getElementById('cardSelection').classList.add('hidden');

        // Reset elixir button colors
        document.querySelectorAll('.elixir-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600');
            btn.classList.add('bg-purple-600');
        });

        this.selectedElixir = null;
    }

    saveState() {
        this.history.push(JSON.parse(JSON.stringify(this.deck)));
        // Keep only last 10 states
        if (this.history.length > 10) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.deck = this.history.pop();
            this.updateDeckDisplay();
        }
    }

    initializeEvoDragDrop() {
        const evoStar = document.getElementById('evoStar');

        evoStar.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', 'evo');
            evoStar.classList.add('dragging');
        });

        evoStar.addEventListener('dragend', () => {
            evoStar.classList.remove('dragging');
        });

        // Add drop listeners to card slots
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.deck[parseInt(slot.dataset.position)]) {
                    slot.classList.add('drop-zone');
                }
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drop-zone');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drop-zone');

                const position = parseInt(slot.dataset.position);
                const card = this.deck[position];

                if (card && e.dataTransfer.getData('text/plain') === 'evo') {
                    this.saveState();
                    card.isEvo = !card.isEvo; // Toggle evo status
                    this.updateDeckDisplay();
                }
            });
        });
    }

    initializeVoiceRecognition() {
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButton();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButton();
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.processVoiceCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateVoiceButton();
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
            document.getElementById('voiceBtn').style.display = 'none';
        }
    }

    toggleVoiceRecognition() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (this.isListening) {
            voiceBtn.textContent = '🔴';
            voiceBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            voiceBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            voiceBtn.title = 'Listening... Click to stop';
        } else {
            voiceBtn.textContent = '🎤';
            voiceBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            voiceBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            voiceBtn.title = 'Voice Recognition';
        }
    }

    processVoiceCommand(transcript) {
        console.log('Voice command:', transcript);

        // Check if command starts with "add"
        if (transcript.startsWith('add ')) {
            const cardName = transcript.substring(4).trim(); // Remove "add " prefix
            this.addCardByVoice(cardName);
        }
    }

    addCardByVoice(spokenCardName) {
        // Find the best matching card name
        const matchedCard = this.findBestCardMatch(spokenCardName);

        if (matchedCard) {
            console.log(`Adding card: ${matchedCard.name}`);
            this.selectCard(matchedCard);

            // Show a brief confirmation
            this.showVoiceConfirmation(`Added: ${matchedCard.name}`);
        } else {
            console.log(`Card not found: ${spokenCardName}`);
            this.showVoiceConfirmation(`Card not found: ${spokenCardName}`);
        }
    }

    findBestCardMatch(spokenName) {
        const spoken = spokenName.toLowerCase().trim();

        // First, try exact match with card names
        for (const elixirCost in this.cards) {
            for (const card of this.cards[elixirCost]) {
                if (card.name.toLowerCase() === spoken) {
                    return card;
                }
            }
        }

        // Second, try exact match with alternatives
        for (const elixirCost in this.cards) {
            for (const card of this.cards[elixirCost]) {
                if (card.alternatives) {
                    for (const alt of card.alternatives) {
                        if (alt.toLowerCase() === spoken) {
                            return card;
                        }
                    }
                }
            }
        }

        // Third, try partial match with card names
        for (const elixirCost in this.cards) {
            for (const card of this.cards[elixirCost]) {
                if (card.name.toLowerCase().includes(spoken) || spoken.includes(card.name.toLowerCase())) {
                    return card;
                }
            }
        }

        // Fourth, try partial match with alternatives
        for (const elixirCost in this.cards) {
            for (const card of this.cards[elixirCost]) {
                if (card.alternatives) {
                    for (const alt of card.alternatives) {
                        if (alt.toLowerCase().includes(spoken) || spoken.includes(alt.toLowerCase())) {
                            return card;
                        }
                    }
                }
            }
        }

        // Finally, try fuzzy matching (remove common words and check)
        const cleanSpoken = spoken.replace(/\b(the|a|an)\b/g, '').trim();
        for (const elixirCost in this.cards) {
            for (const card of this.cards[elixirCost]) {
                const cleanCardName = card.name.toLowerCase().replace(/\b(the|a|an)\b/g, '').trim();
                if (cleanCardName.includes(cleanSpoken) || cleanSpoken.includes(cleanCardName)) {
                    return card;
                }
            }
        }

        return null;
    }

    showVoiceConfirmation(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 2 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeckTracker();
});