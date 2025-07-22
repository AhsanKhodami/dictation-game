// Game state variables
let currentGame = {
    words: [],
    currentWordIndex: 0,
    score: 0,
    totalWords: 0,
    incorrectWords: []
};

// DOM elements
const setupSection = document.getElementById('setupSection');
const gameSection = document.getElementById('gameSection');
const resultsSection = document.getElementById('resultsSection');
const customWordsModal = document.getElementById('customWordsModal');

const wordCountInput = document.getElementById('wordCount');
const wordSetSelect = document.getElementById('wordSet');
const startGameBtn = document.getElementById('startGame');
const addCustomWordsBtn = document.getElementById('addCustomWordsBtn');

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const currentWordNumber = document.getElementById('currentWordNumber');
const playButton = document.getElementById('playButton');
const replayButton = document.getElementById('replayButton');
const userInput = document.getElementById('userInput');
const checkButton = document.getElementById('checkButton');
const feedback = document.getElementById('feedback');
const actionButtons = document.getElementById('actionButtons');
const nextButton = document.getElementById('nextButton');
const tryAgainButton = document.getElementById('tryAgainButton');

const scorePercentage = document.getElementById('scorePercentage');
const correctCount = document.getElementById('correctCount');
const totalCount = document.getElementById('totalCount');
const incorrectWordsSection = document.getElementById('incorrectWords');
const incorrectWordsList = document.getElementById('incorrectWordsList');
const playAgainButton = document.getElementById('playAgainButton');
const newGameButton = document.getElementById('newGameButton');
const exitGameButton = document.getElementById('exitGameButton');

// Modal elements
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');
const customListName = document.getElementById('customListName');
const customWords = document.getElementById('customWords');
const wordCountDisplay = document.getElementById('wordCount');
const wordPreview = document.getElementById('wordPreview');
const saveCustomWords = document.getElementById('saveCustomWords');

// Text-to-Speech setup
let currentUtterance = null;
let voicesLoaded = false;
let availableVoices = [];

// Game state for better Enter key handling
let gameState = 'setup'; // 'setup', 'playing', 'checked', 'results'

// Notification element
const notification = document.getElementById('notification');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    startGameBtn.addEventListener('click', startGame);
    playButton.addEventListener('click', () => speakWord(getCurrentWord()));
    replayButton.addEventListener('click', () => speakWord(getCurrentWord()));
    checkButton.addEventListener('click', checkAnswer);
    nextButton.addEventListener('click', nextWord);
    tryAgainButton.addEventListener('click', tryAgain);
    playAgainButton.addEventListener('click', playAgain);
    newGameButton.addEventListener('click', newGame);
    exitGameButton.addEventListener('click', exitToHome);
    
    // Modal event listeners
    addCustomWordsBtn.addEventListener('click', openCustomWordsModal);
    closeModal.addEventListener('click', closeCustomWordsModal);
    cancelModal.addEventListener('click', closeCustomWordsModal);
    saveCustomWords.addEventListener('click', saveCustomWordList);
    customWords.addEventListener('input', updateWordPreview);
    
    // Close modal when clicking outside
    customWordsModal.addEventListener('click', function(e) {
        if (e.target === customWordsModal) {
            closeCustomWordsModal();
        }
    });
    
    // Enhanced Enter key support
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleEnterKey();
        }
    });
    
    // Input validation
    userInput.addEventListener('input', function() {
        checkButton.disabled = this.value.trim() === '';
    });
    
    // Load custom word lists from localStorage
    loadCustomWordLists();
    
    // Initialize speech synthesis
    initializeSpeechSynthesis();
    
    // Initialize
    checkButton.disabled = true;
    gameState = 'setup';
});

function startGame() {
    const wordCount = parseInt(wordCountInput.value);
    const selectedSet = wordSetSelect.value;
    
    if (wordCount < 1 || wordCount > 20) {
        alert('Please enter a number between 1 and 20');
        return;
    }
    
    // Get random words from selected set
    const allWords = window.wordSets[selectedSet];
    currentGame.words = getRandomWords(allWords, wordCount);
    currentGame.currentWordIndex = 0;
    currentGame.score = 0;
    currentGame.totalWords = wordCount;
    currentGame.incorrectWords = [];
    
    // Switch to game section
    setupSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    gameState = 'playing';
    
    // Initialize game UI
    updateProgress();
    updateWordDisplay();
    resetFeedback();
    userInput.value = '';
    userInput.focus();
    
    // Automatically play the first word
    setTimeout(() => speakWord(getCurrentWord()), 500);
}

function getRandomWords(wordArray, count) {
    const shuffled = [...wordArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, wordArray.length));
}

function getCurrentWord() {
    return currentGame.words[currentGame.currentWordIndex];
}

function updateProgress() {
    const progress = ((currentGame.currentWordIndex) / currentGame.totalWords) * 100;
    progressBar.style.width = progress + '%';
    progressText.textContent = `${currentGame.currentWordIndex} / ${currentGame.totalWords}`;
}

function updateWordDisplay() {
    currentWordNumber.textContent = currentGame.currentWordIndex + 1;
}

function speakWord(word) {
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
        showNotification('Speech synthesis not available in this browser', 'error');
        return;
    }

    // Stop any current speech
    if (currentUtterance) {
        speechSynthesis.cancel();
    }
    
    // Wait a moment for cancellation to complete
    setTimeout(() => {
        try {
            // Create new utterance
            currentUtterance = new SpeechSynthesisUtterance(word);
            currentUtterance.rate = 0.8; // Slightly slower for dictation
            currentUtterance.volume = 1;
            currentUtterance.pitch = 1;
            
            // Use the best available English voice
            if (availableVoices.length > 0) {
                const englishVoice = availableVoices.find(voice => 
                    voice.lang.startsWith('en-') && 
                    (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Samantha'))
                ) || availableVoices.find(voice => voice.lang.startsWith('en-')) || availableVoices[0];
                
                if (englishVoice) {
                    currentUtterance.voice = englishVoice;
                }
            }
            
            // Add visual feedback
            playButton.classList.add('loading');
            replayButton.classList.add('loading');
            playButton.disabled = true;
            replayButton.disabled = true;
            
            currentUtterance.onstart = function() {
                console.log('Speech started for:', word);
            };
            
            currentUtterance.onend = function() {
                playButton.classList.remove('loading');
                replayButton.classList.remove('loading');
                playButton.disabled = false;
                replayButton.disabled = false;
            };
            
            currentUtterance.onerror = function(event) {
                console.error('Speech synthesis error:', event);
                playButton.classList.remove('loading');
                replayButton.classList.remove('loading');
                playButton.disabled = false;
                replayButton.disabled = false;
                
                // Don't show error for common interruptions
                if (event.error !== 'interrupted' && event.error !== 'canceled') {
                    showNotification('Speech playback failed. Please try again.', 'warning');
                }
            };
            
            // Speak the word
            speechSynthesis.speak(currentUtterance);
            
        } catch (error) {
            console.error('Error creating speech:', error);
            playButton.classList.remove('loading');
            replayButton.classList.remove('loading');
            playButton.disabled = false;
            replayButton.disabled = false;
            showNotification('Speech synthesis error. Please try again.', 'error');
        }
    }, 100);
}

function checkAnswer() {
    const userAnswer = userInput.value.trim().toLowerCase();
    const correctWord = getCurrentWord().toLowerCase();
    const isCorrect = userAnswer === correctWord;
    
    // Show feedback
    showFeedback(isCorrect, correctWord);
    
    if (isCorrect) {
        currentGame.score++;
    } else {
        currentGame.incorrectWords.push({
            word: getCurrentWord(),
            userAnswer: userInput.value.trim()
        });
    }
    
    // Disable input and check button
    userInput.disabled = true;
    checkButton.disabled = true;
    gameState = 'checked';
    
    // Show action buttons
    actionButtons.classList.remove('hidden');
    
    if (isCorrect) {
        tryAgainButton.style.display = 'none';
        nextButton.style.display = 'inline-block';
        nextButton.focus(); // Focus next button for Enter key
    } else {
        tryAgainButton.style.display = 'inline-block';
        nextButton.style.display = 'inline-block';
        tryAgainButton.focus(); // Focus try again button for Enter key
    }
}

function showFeedback(isCorrect, correctWord) {
    const feedbackIcon = feedback.querySelector('.feedback-icon');
    const feedbackText = feedback.querySelector('.feedback-text');
    const correctWordDisplay = feedback.querySelector('.correct-word');
    
    if (isCorrect) {
        feedback.className = 'feedback correct';
        feedbackIcon.textContent = '✅';
        feedbackText.textContent = 'Excellent! That\'s correct!';
        correctWordDisplay.textContent = '';
    } else {
        feedback.className = 'feedback incorrect';
        feedbackIcon.textContent = '❌';
        feedbackText.textContent = 'Not quite right. Try again!';
        correctWordDisplay.textContent = `The correct spelling is: "${correctWord}"`;
    }
    
    feedback.classList.remove('hidden');
}

function resetFeedback() {
    feedback.classList.add('hidden');
    actionButtons.classList.add('hidden');
}

function tryAgain() {
    userInput.value = '';
    userInput.disabled = false;
    userInput.focus();
    checkButton.disabled = true;
    resetFeedback();
    gameState = 'playing';
    
    // Play the word again
    setTimeout(() => speakWord(getCurrentWord()), 300);
}

function nextWord() {
    currentGame.currentWordIndex++;
    
    if (currentGame.currentWordIndex >= currentGame.totalWords) {
        // Game finished
        showResults();
        return;
    }
    
    // Prepare for next word
    userInput.value = '';
    userInput.disabled = false;
    userInput.focus();
    checkButton.disabled = true;
    resetFeedback();
    updateProgress();
    updateWordDisplay();
    gameState = 'playing';
    
    // Play the next word
    setTimeout(() => speakWord(getCurrentWord()), 500);
}

function showResults() {
    gameSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    gameState = 'results';
    
    const percentage = Math.round((currentGame.score / currentGame.totalWords) * 100);
    
    // Animate score
    animateScore(percentage);
    
    correctCount.textContent = currentGame.score;
    totalCount.textContent = currentGame.totalWords;
    
    // Show incorrect words if any
    if (currentGame.incorrectWords.length > 0) {
        incorrectWordsSection.classList.remove('hidden');
        incorrectWordsList.innerHTML = '';
        
        currentGame.incorrectWords.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${item.word}</strong> 
                ${item.userAnswer ? `(you typed: "${item.userAnswer}")` : '(no answer provided)'}
            `;
            incorrectWordsList.appendChild(li);
        });
    } else {
        incorrectWordsSection.classList.add('hidden');
    }
}

function animateScore(targetPercentage) {
    let currentPercentage = 0;
    const increment = targetPercentage / 30; // 30 frames for smooth animation
    
    const timer = setInterval(() => {
        currentPercentage += increment;
        if (currentPercentage >= targetPercentage) {
            currentPercentage = targetPercentage;
            clearInterval(timer);
        }
        scorePercentage.textContent = Math.round(currentPercentage) + '%';
    }, 50);
}

function playAgain() {
    // Reset game with same settings
    currentGame.currentWordIndex = 0;
    currentGame.score = 0;
    currentGame.incorrectWords = [];
    
    // Shuffle words again
    const wordCount = currentGame.totalWords;
    const selectedSet = wordSetSelect.value;
    const allWords = window.wordSets[selectedSet];
    currentGame.words = getRandomWords(allWords, wordCount);
    
    // Switch back to game
    resultsSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    
    // Reset UI
    updateProgress();
    updateWordDisplay();
    resetFeedback();
    userInput.value = '';
    userInput.disabled = false;
    userInput.focus();
    checkButton.disabled = true;
    
    // Play first word
    setTimeout(() => speakWord(getCurrentWord()), 500);
}

function newGame() {
    // Reset everything and go back to setup
    resultsSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    gameState = 'setup';
    
    // Reset form values
    wordCountInput.value = 5;
    wordSetSelect.selectedIndex = 0;
}

function exitToHome() {
    // Show confirmation for exit during game
    if (currentGame.currentWordIndex > 0) {
        if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
            performExitToHome();
        }
    } else {
        performExitToHome();
    }
}

function performExitToHome() {
    // Stop any current speech
    if (currentUtterance) {
        speechSynthesis.cancel();
    }
    
    // Reset game state
    currentGame = {
        words: [],
        currentWordIndex: 0,
        score: 0,
        totalWords: 0,
        incorrectWords: []
    };
    
    // Return to home screen
    gameSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    gameState = 'setup';
    
    // Reset form values
    wordCountInput.value = 5;
    wordSetSelect.selectedIndex = 0;
    
    // Show exit notification
    showNotification('Returned to home screen', 'info', 2000);
}

// Enhanced Enter key handling
function handleEnterKey() {
    switch (gameState) {
        case 'setup':
            if (!startGameBtn.disabled) {
                startGame();
            }
            break;
        case 'playing':
            if (!checkButton.disabled && userInput.value.trim() !== '') {
                checkAnswer();
            }
            break;
        case 'checked':
            // If there's a focused button, click it, otherwise go to next word
            const focusedBtn = document.activeElement;
            if (focusedBtn === tryAgainButton) {
                tryAgain();
            } else {
                nextWord();
            }
            break;
        case 'results':
            playAgain();
            break;
    }
}

// Custom word list functions
function openCustomWordsModal() {
    customWordsModal.classList.remove('hidden');
    customListName.focus();
}

function closeCustomWordsModal() {
    customWordsModal.classList.add('hidden');
    customListName.value = '';
    customWords.value = '';
    updateWordPreview();
}

function updateWordPreview() {
    const input = customWords.value.trim();
    const words = parseWordsInput(input);
    
    wordCountDisplay.textContent = words.length;
    wordPreview.innerHTML = '';
    
    if (words.length > 0) {
        words.forEach(word => {
            const span = document.createElement('span');
            span.className = 'preview-word';
            span.textContent = word;
            wordPreview.appendChild(span);
        });
    } else {
        wordPreview.innerHTML = '<em style="color: #999;">No words to preview</em>';
    }
    
    // Enable/disable save button
    saveCustomWords.disabled = words.length === 0 || customListName.value.trim() === '';
}

function parseWordsInput(input) {
    if (!input) return [];
    
    // Split by comma, semicolon, tab, or newline
    const words = input
        .split(/[,;\t\n]+/)
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0 && /^[a-zA-Z\s]+$/.test(word));
    
    // Remove duplicates
    return [...new Set(words)];
}

function saveCustomWordList() {
    const listName = customListName.value.trim();
    const words = parseWordsInput(customWords.value);
    
    if (!listName || words.length === 0) {
        showNotification('Please provide a list name and at least one valid word.', 'warning');
        return;
    }
    
    if (words.length < 3) {
        showNotification('Please provide at least 3 words for a meaningful practice session.', 'warning');
        return;
    }
    
    // Save to localStorage
    const customLists = JSON.parse(localStorage.getItem('customWordLists') || '{}');
    const listKey = 'custom_' + listName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    customLists[listKey] = {
        name: listName,
        words: words,
        created: new Date().toISOString()
    };
    
    localStorage.setItem('customWordLists', JSON.stringify(customLists));
    
    // Add to wordSets
    window.wordSets[listKey] = words;
    
    // Add to select dropdown
    const option = document.createElement('option');
    option.value = listKey;
    option.textContent = `${listName} (${words.length} words)`;
    wordSetSelect.appendChild(option);
    
    // Select the new list
    wordSetSelect.value = listKey;
    
    closeCustomWordsModal();
    
    // Show success notification
    showNotification(`Word list "${listName}" saved successfully with ${words.length} words!`, 'success');
}

function loadCustomWordLists() {
    const customLists = JSON.parse(localStorage.getItem('customWordLists') || '{}');
    
    Object.entries(customLists).forEach(([key, list]) => {
        // Add to wordSets
        window.wordSets[key] = list.words;
        
        // Add to select dropdown
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${list.name} (${list.words.length} words)`;
        
        // Add delete button for custom lists
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-list-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCustomWordList(key, list.name);
        };
        
        wordSetSelect.appendChild(option);
    });
}

function deleteCustomWordList(key, name) {
    if (confirm(`Are you sure you want to delete the word list "${name}"?`)) {
        // Remove from localStorage
        const customLists = JSON.parse(localStorage.getItem('customWordLists') || '{}');
        delete customLists[key];
        localStorage.setItem('customWordLists', JSON.stringify(customLists));
        
        // Remove from wordSets
        delete window.wordSets[key];
        
        // Remove from select dropdown
        const option = wordSetSelect.querySelector(`option[value="${key}"]`);
        if (option) {
            option.remove();
        }
        
        // If this was the selected option, select the first one
        if (wordSetSelect.value === key) {
            wordSetSelect.selectedIndex = 0;
        }
    }
}

// Load voices when available
speechSynthesis.onvoiceschanged = function() {
    loadVoices();
};

// Initialize speech synthesis
function initializeSpeechSynthesis() {
    if (window.speechSynthesis) {
        loadVoices();
        // Trigger voice loading
        speechSynthesis.getVoices();
    } else {
        showNotification('Speech synthesis not supported in this browser', 'warning');
    }
}

function loadVoices() {
    availableVoices = speechSynthesis.getVoices();
    voicesLoaded = true;
    console.log('Available voices:', availableVoices.length);
    
    // Log English voices for debugging
    const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en-'));
    console.log('English voices:', englishVoices.map(v => `${v.name} (${v.lang})`));
}

// Notification system
function showNotification(message, type = 'info', duration = 4000) {
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationText = notification.querySelector('.notification-text');
    const notificationClose = notification.querySelector('.notification-close');
    
    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notificationIcon.textContent = icons[type] || icons.info;
    notificationText.textContent = message;
    
    // Remove existing type classes and add new one
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto-hide after duration
    setTimeout(() => {
        hideNotification();
    }, duration);
    
    // Close button functionality
    notificationClose.onclick = hideNotification;
}

function hideNotification() {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
        notification.classList.add('hidden');
        notification.style.animation = '';
    }, 300);
}
