// Game configuration and state variables
const difficultySettings = {
  easy: {
    goalScore: 4000,
    startingTime: 60,
    rockPenalty: 100,
    spawnRate: 750,
    expirationTime: 1750,
    rockChance: 0.15
  },
  normal: {
    goalScore: 5000,
    startingTime: 60,
    rockPenalty: 200,
    spawnRate: 750,
    expirationTime: 1000,
    rockChance: 0.2
  },
  hard: {
    goalScore: 7000,
    startingTime: 80,
    rockPenalty: 300,
    spawnRate: 600,
    expirationTime: 750,
    rockChance: 0.35
  }
};
const winningMessages = [
  'Amazing work! You reached the goal!',
  'You won! Congratulations!',
  'Great job! You did it!'
];
const losingMessages = [
  'Keep going! Try again to reach the goal.',
  'Almost there! Play again and collect more water cans.',
  'Good effort! You can make it next time.'
];
const firstMilestoneMessages = [
  'Every drop counts! Keep collecting!',
  'You are just getting started. Keep going!',
  'Keep collecting to reach the first milestone!'
];
const secondMilestoneMessages = [
  'Nice progress! You are getting closer to the goal.',
  'Great momentum! Keep collecting water cans.',
  'You are getting closer. Keep up the good work!'
];
let currentScore = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let gamePaused = false;       // Tracks if the active game is paused
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;          // Holds the interval for counting down the game
let countdownInterval;       // Holds the interval for the resume countdown
let time = 60;                 // Total time for the game in seconds
let confettiPlayed = false;
const reachedMilestones = new Set();
let activeDifficulty = difficultySettings.normal;
const audioContext = new AudioContext();
const soundBuffers = {};

const soundsReady = Promise.all([
  loadSound('pop', 'sounds/pop.mp3'),
  loadSound('thud', 'sounds/thud.mp3')
]);

async function loadSound(name, url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load sound: ${url}`);
  }
  const audioData = await response.arrayBuffer();
  soundBuffers[name] = await audioContext.decodeAudioData(audioData);
}

async function playSound(name) {
  await soundsReady;

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  source.buffer = soundBuffers[name];
  source.connect(audioContext.destination);
  source.start();
}

function playPopSound() {
  playSound('pop').catch(error => {
    console.error('Unable to play the water-can sound.', error);
  });
}

function playThudSound() {
  playSound('thud').catch(error => {
    console.error('Unable to play the rock sound.', error);
  });
}

function setDifficultyEnabled(enabled) {
  document.getElementById('difficulty').disabled = !enabled;
}

function updateDifficultyDisplay() {
  const selectedDifficulty = document.getElementById('difficulty').value;
  const settings = difficultySettings[selectedDifficulty];
  document.getElementById('goal-score').textContent = `${settings.goalScore.toLocaleString()} points`;
  document.getElementById('rock-penalty').textContent = `-${settings.rockPenalty}`;

  if (!gameActive) {
    document.getElementById('timer').textContent = settings.startingTime;
  }
}

function updateProgress() {
  const progress = Math.min(Math.max(currentScore / activeDifficulty.goalScore, 0), 1) * 100;
  document.getElementById('progressbar').style.width = `${progress}%`;

  [activeDifficulty.goalScore / 3, (activeDifficulty.goalScore * 2) / 3]
    .forEach((milestoneScore, index) => {
    const milestone = document.querySelector(`.milestone-${index + 1}`);
    const milestoneReached = currentScore >= milestoneScore;

    if (!milestoneReached) {
      reachedMilestones.delete(index);
      milestone.classList.remove('reached');
      return;
    }

    if (reachedMilestones.has(index)) return;

    reachedMilestones.add(index);
    milestone.classList.add('reached');
  });

  const goalMarker = document.getElementById('goal-marker');
  if (currentScore >= activeDifficulty.goalScore) {
    goalMarker.classList.add('reached');
  } else {
    goalMarker.classList.remove('reached');
  }
}

function resetProgress() {
  reachedMilestones.clear();
  document.getElementById('progressbar').style.width = '0%';
  document.querySelectorAll('.milestone').forEach(milestone => {
    milestone.classList.remove('reached');
  });
  document.getElementById('goal-marker').classList.remove('reached');
}

function getRockChance() {
  if (activeDifficulty === difficultySettings.easy) {
    return time < 55 ? activeDifficulty.rockChance : 0;
  }

  if (activeDifficulty === difficultySettings.hard) {
    return activeDifficulty.rockChance;
  }

  if (time < 20) return 0.35;
  if (time < 55) return activeDifficulty.rockChance;
  return 0;
}

// Creates the 3x3 game grid where items will appear
function createGrid() {
  let grid = document.querySelector('.game-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'game-grid';
    document.querySelector('main').insertBefore(grid, document.getElementById('start-game'));
    grid.addEventListener('click', handleGridClick);
  }
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
  const rockChance = getRockChance();
  const itemClass = Math.random() < rockChance ? 'rock' : 'water-can';

  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <div class="${itemClass}"></div>
    </div>
  `;

  const item = randomCell.querySelector(`.${itemClass}`);
  const removeItem = () => {
    if (item?.isConnected) {
      if (gamePaused) {
        setTimeout(removeItem, activeDifficulty.expirationTime);
        return;
      }
      shrinkWaterCan(item);
    }
  };
  setTimeout(removeItem, activeDifficulty.expirationTime);
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
  const selectedDifficulty = document.getElementById('difficulty').value;
  activeDifficulty = difficultySettings[selectedDifficulty];
  createGrid(); // Set up the game grid
  gameActive = true;
  gamePaused = false;
  setDifficultyEnabled(false);
  const gameButton = document.getElementById('start-game');
  gameButton.textContent = 'Pause Game';
  gameButton.classList.add('pause-state');
  time = activeDifficulty.startingTime;
  document.getElementById('timer').textContent = time;
  document.getElementById('goal-score').textContent = `${activeDifficulty.goalScore.toLocaleString()} points`;
  document.getElementById('rock-penalty').textContent = `-${activeDifficulty.rockPenalty}`;
  resetProgress();
  startGameIntervals();
}

function startGameIntervals() {
  spawnInterval = setInterval(spawnItem, activeDifficulty.spawnRate);
  timerInterval = setInterval(() => {
    time -= 1;
    document.getElementById('timer').textContent = time;
    
    if (activeDifficulty === difficultySettings.normal && time === 30) {
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnItem, 600);
    }
    else if (activeDifficulty === difficultySettings.normal && time === 15) {
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnItem, 500);
    }
    
    if (time === 0) {
      endGame();
    }
  }, 1000);
}

function pauseGame() {
  gamePaused = true;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  document.querySelector('.game-grid').classList.add('paused');
  const gameButton = document.getElementById('start-game');
  gameButton.textContent = 'Continue Game';
  gameButton.classList.remove('pause-state');
}

function continueGame() {
  const grid = document.querySelector('.game-grid');
  let countdown = 3;
  const countdownOverlay = document.createElement('div');
  countdownOverlay.className = 'countdown-overlay';
  countdownOverlay.textContent = countdown;
  grid.appendChild(countdownOverlay);
  document.getElementById('start-game').disabled = true;

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdown -= 1;
    countdownOverlay.textContent = countdown;

    if (countdown === 0) {
      clearInterval(countdownInterval);
      countdownOverlay.remove();
      grid.classList.remove('paused');
      gamePaused = false;
      startGameIntervals();
      const gameButton = document.getElementById('start-game');
      gameButton.disabled = false;
      gameButton.textContent = 'Pause Game';
      gameButton.classList.add('pause-state');
    }
  }, 1000);
}

function endGame() {
  gameActive = false; // Mark the game as inactive
  gamePaused = false;
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop counting down the game
  clearInterval(countdownInterval);
  document.querySelector('.countdown-overlay')?.remove();
  document.querySelector('.game-grid')?.remove();
  const firstMilestone = activeDifficulty.goalScore / 3;
  const secondMilestone = (activeDifficulty.goalScore * 2) / 3;
  let messages;

  if (currentScore >= activeDifficulty.goalScore) {
    messages = winningMessages;
  } else if (currentScore >= secondMilestone) {
    messages = losingMessages;
  } else if (currentScore >= firstMilestone) {
    messages = secondMilestoneMessages;
  } else {
    messages = firstMilestoneMessages;
  }

  const resultMessage = messages[Math.floor(Math.random() * messages.length)];
  document.getElementById('result-message').textContent = resultMessage;
  if (currentScore >= activeDifficulty.goalScore && !confettiPlayed) {
    confettiPlayed = true;
    playConfetti();
  }
  document.querySelectorAll('.grid-cell').forEach(cell => {
    cell.innerHTML = '';
  });

  const gameButton = document.getElementById('start-game');
  gameButton.id = 'reset-game';
  gameButton.textContent = 'Reset Game';
  gameButton.classList.remove('pause-state');
  gameButton.disabled = false;
  gameButton.removeEventListener('click', handleGameButtonClick);
  gameButton.addEventListener('click', resetGame);
}

function resetGame() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  gameActive = false;
  gamePaused = false;
  setDifficultyEnabled(true);
  currentScore = 0;
  time = 60;
  confettiPlayed = false;

  document.getElementById('current-score').textContent = currentScore;
  resetProgress();
  updateDifficultyDisplay();
  document.getElementById('result-message').textContent = '';
  document.getElementById('confetti-container')?.remove();
  document.getElementById('reset-game')?.remove();
  document.querySelector('.countdown-overlay')?.remove();

  const startButton = document.createElement('button');
  startButton.id = 'start-game';
  startButton.textContent = 'Start Game';
  startButton.addEventListener('click', handleGameButtonClick);
  document.querySelector('main').appendChild(startButton);
  createGrid();
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
function handleGridClick(event) {
  if (!gameActive || gamePaused || !(event.target instanceof Element)) return;

  const item = event.target.closest('.water-can, .rock');
  if (!item) return;
  if (item.classList.contains('shrinking')) return;

  const isWaterCan = item.classList.contains('water-can');
  if (isWaterCan) {
    playPopSound();
  } else {
    playThudSound();
  }
  currentScore += isWaterCan ? 100 : -activeDifficulty.rockPenalty;
  document.getElementById('current-score').textContent = currentScore;
  shrinkWaterCan(item);
  updateProgress();
}

function handleGameButtonClick() {
  if (!gameActive) {
    startGame();
  } else if (gamePaused) {
    continueGame();
  } else {
    pauseGame();
  }
}

// Set up click handlers for the game controls
document.querySelector('.game-grid').addEventListener('click', handleGridClick);
document.getElementById('start-game').addEventListener('click', handleGameButtonClick);
document.getElementById('difficulty').addEventListener('change', updateDifficultyDisplay);
