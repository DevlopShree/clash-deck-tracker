class DeckTracker {
    constructor() {
        this.cards = {};
        this.deck = Array(8).fill(null); // 8 card slots, initially empty
        this.history = []; // For undo functionality
        this.selectedElixir = null;
        
        this.loadCards();
        this.initializeEventListeners();
    }

    async loadCards() {
        try {
            const response = await fetch('cards.json');
            this.cards = await response.json();
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
                cardBtn.className = 'card-button bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm font-medium';
                cardBtn.textContent = card.name;
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
                    <span class="font-medium">${card.name}</span>
                    ${card.isEvo ? '<span class="evo-star">⭐</span>' : ''}
                `;
                slot.classList.remove('bg-gray-800');
                slot.classList.add('bg-green-700');
            } else {
                slot.innerHTML = '<span class="text-gray-400">Unknown</span>';
                slot.classList.remove('bg-green-700');
                slot.classList.add('bg-gray-800');
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeckTracker();
});