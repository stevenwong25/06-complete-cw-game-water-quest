// Game configuration and state variables
const GOAL_SCORE = 5000;        // Total items needed to collect
const winningMessages = [
  'Amazing work! You reached the goal.',
  'You won! Congratulations!',
  'Great job! You did it!'
];
const losingMessages = [
  'Keep going! Try again to reach the goal.',
  'Almost there! Play again and collect more water cans.',
  'Good effort! You can make it next time.'
];
let currentScore = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;          // Holds the interval for counting down the game
let time = 60;                 // Total time for the game in seconds
let confettiPlayed = false;

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// Spawns a new item in a random grid cell
function spawnItem() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  const emptyCells = [...cells].filter(cell => !cell.querySelector('.water-can, .rock'));

  if (emptyCells.length === 0) return;

  // Select a random empty cell from the grid to place the item
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const rockChance = time < 20 ? 0.35 : time < 55 ? 0.2 : 0;
  const itemClass = Math.random() < rockChance ? 'rock' : 'water-can';

  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="${itemClass}"></div>
    </div>
  `;

  const item = randomCell.querySelector(`.${itemClass}`);
  setTimeout(() => {
    if (item?.isConnected) {
      shrinkWaterCan(item);
    }
  }, 1000);
}

// Handles the shrinking animation and removal of a water can or rock
function shrinkWaterCan(waterCan) {
  if (!waterCan.isConnected || waterCan.classList.contains('shrinking')) return;

  waterCan.classList.add('shrinking');
  waterCan.addEventListener('animationend', () => {
    waterCan.closest('.water-can-wrapper')?.remove();
  }, { once: true });
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  createGrid(); // Set up the game grid
  gameActive = true;
  document.getElementById('start-game')?.remove();
  time = 60;
  document.getElementById('timer').textContent = time;
  spawnInterval = setInterval(spawnItem, 750); // Spawn items every 750ms
  timerInterval = setInterval(() => {
    time -= 1;
    document.getElementById('timer').textContent = time;

    if (time === 30) {
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnItem, 600);
    }
    else if (time === 15) {
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnItem, 500);
    }

    if (time === 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop counting down the game
  const messages = currentScore >= GOAL_SCORE ? winningMessages : losingMessages;
  const resultMessage = messages[Math.floor(Math.random() * messages.length)];
  document.getElementById('result-message').textContent = resultMessage;
  if (currentScore >= GOAL_SCORE && !confettiPlayed) {
    confettiPlayed = true;
    playConfetti();
  }
  document.querySelectorAll('.grid-cell').forEach(cell => {
    cell.innerHTML = '';
  });

  const resetButton = document.getElementById('reset-game');
  if (!resetButton) {
    const button = document.createElement('button');
    button.id = 'reset-game';
    button.textContent = 'Reset Game';
    button.addEventListener('click', resetGame);
    document.querySelector('.container').appendChild(button);
  }
}

function resetGame() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  gameActive = false;
  currentScore = 0;
  time = 60;
  confettiPlayed = false;

  document.getElementById('current-score').textContent = currentScore;
  document.getElementById('timer').textContent = time;
  document.getElementById('achievements').textContent = '';
  document.getElementById('result-message').textContent = '';
  document.getElementById('confetti-container')?.remove();
  document.getElementById('reset-game')?.remove();
  createGrid();

  const startButton = document.createElement('button');
  startButton.id = 'start-game';
  startButton.textContent = 'Start Game';
  startButton.addEventListener('click', startGame);
  document.querySelector('.container').appendChild(startButton);
}

function playConfetti() {
  const confettiContainer = document.createElement('div');
  confettiContainer.id = 'confetti-container';
  confettiContainer.setAttribute('aria-hidden', 'true');

  const colors = ['#ffc907', '#2e9df7', '#4fcb53', '#ff902a'];
  for (let i = 0; i < 40; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.setProperty('--confetti-x', `${(Math.random() - 0.5) * 180}px`);
    piece.style.setProperty('--confetti-rotation', `${Math.random() * 720 - 360}deg`);
    confettiContainer.appendChild(piece);
  }

  document.querySelector('.container').appendChild(confettiContainer);
  setTimeout(() => confettiContainer.remove(), 3000);
}

// Updates points appropriately when the active water can or rock is clicked
document.querySelector('.game-grid').addEventListener('click', event => {
  if (!gameActive || !(event.target instanceof Element)) return;

  const item = event.target.closest('.water-can, .rock');
  if (!item) return;
  if (item.classList.contains('shrinking')) return;

  currentScore += item.classList.contains('rock') ? -200 : 100;
  document.getElementById('current-score').textContent = currentScore;
  shrinkWaterCan(item);
});

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', startGame);
