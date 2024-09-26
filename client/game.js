/*
	FLAPPI IS HEAVILY INSPIRED BY
	https://codepen.io/ju-az/pen/eYJQwLx
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const header = document.getElementById('header');
const clickScreen = document.getElementById('clickScreen');
const mobileInstead = document.getElementById('mobileInstead');
let username = localStorage.getItem("username");
let launched = false;
let touchEventTriggered = false;

let frames_per_second = 60;
let interval = Math.floor(1000 / frames_per_second); // rounding down since our code will rarely run at the exact interval
let startTime = performance.now();
let previousTime = startTime;
let currentTime = 0;
let deltaTime = 0;

try {
	// Check if the Screen Orientation API is supported
	if ('screen' in window && 'orientation' in window.screen) {
		// Lock the screen to portrait mode
		window.screen.orientation.lock('portrait').then(function() {
			console.log("Screen orientation locked");
		}).catch(function(error) {
			console.log("Screen orientation lock failed: " + error);
		});
	} else {
		console.log("Screen Orientation API not supported");
	}
} catch (error) {
	console.log("Screen Orientation API not supported");
}


// Load separate images
const images = {
	backgroundImg: new Image(),
	birdImg: new Image(),

	pipeBodyImg: new Image(),
	pipeEndImg: new Image()
};

// Assign sources to the images
Object.entries(images).forEach(([key, img]) => {
	img.src = `./images/${key}.png`;
});

let imagesLoaded = 0;
Object.values(images).forEach(img => {
	img.onload = () => {
		imagesLoaded++;
		if (imagesLoaded === Object.keys(images).length) {
			window.requestAnimationFrame(render); // Start rendering only after all images are loaded
		}
	};
});

// Game settings and state
const gameState = {
	gamePlaying: false,
	gravity: 0.75,
	speed: 9.3,
	backgroundSpeed: 3.1,
	birdSize: [17*1.5, 12*1.5],
	backgroundWidth: 3000,
	jump: -17.25,
	cTenth: 0,
	index: 0,
	bestScore: 0,
	flight: 0,
	flyHeight: 0,
	currentScore: 0,
	pipes: [],
	pipeWidth: 100,
	pipeGap: 500,
	touchActive: false,
	color: 1,
};

gameState.bestScore = parseInt(localStorage.getItem("bestScore")) || 0;

// Utility functions
const resizeCanvas = () => {
	const dpr = window.devicePixelRatio || 1;
	const minWidth = 280; // Minimum width for the canvas
	const minHeight = 500; // Minimum height for the canvas
	const maxWidth = window.innerHeight / 1.5; // Maximum width for the canvas

	// Calculate the desired width and height within the min and max limits
	const desiredWidth = Math.min(Math.max(window.innerWidth, minWidth), maxWidth);
	const desiredHeight = Math.max(window.innerHeight, minHeight);

	header.style.width = desiredWidth + "px";
	mobileInstead.style.display = desiredWidth == maxWidth ? "block" : "none";
	mobileInstead.style.width = window.innerWidth - desiredWidth + "px";

	// Set the canvas dimensions
	canvas.width = desiredWidth * dpr;
	canvas.height = desiredHeight * dpr;

	// Adjust the canvas style to match the new dimensions
	canvas.style.width = `${desiredWidth}px`;
	canvas.style.height = `${desiredHeight}px`;

	gameState.cTenth = canvas.width / 10;
};

const pipeLoc = () => (Math.random() * ((canvas.height - (gameState.pipeGap + gameState.pipeWidth)) - gameState.pipeWidth)) + gameState.pipeWidth;

const setup = () => {
	gameState.currentScore = 0;
	gameState.flight = gameState.jump;
	gameState.flyHeight = (canvas.height / 2 - (gameState.birdSize[1] / 2)) / (window.devicePixelRatio || 1);
	gameState.pipes = Array(3).fill().map((_, i) => [canvas.width + (i * (gameState.pipeGap + gameState.pipeWidth)), pipeLoc()]);
};

// Main render loop
const render = (timestamp) => {
	currentTime = timestamp;
	deltaTime = currentTime - previousTime;

	if (deltaTime > interval) {
		previousTime = currentTime - (deltaTime % interval);

		gameState.index++;

		// Calculate scale factor for background height
		const backgroundScale = canvas.height / 2000;
		const scaledBackgroundWidth = 3000 * backgroundScale;

		// Calculate the x position for seamless looping
		const backgroundX = -((gameState.index * (gameState.backgroundSpeed)) % scaledBackgroundWidth) + scaledBackgroundWidth;

		// Draw the scaled background images with slight overlap
		ctx.drawImage(images.backgroundImg, backgroundX - scaledBackgroundWidth, 0, scaledBackgroundWidth, canvas.height);
		ctx.drawImage(images.backgroundImg, backgroundX - 5, 0, scaledBackgroundWidth, canvas.height); // Overlap by 5 pixels

		//                                              ^^^ to remove white intersecting line when images are exactly adjacent

		// Pipes and collision logic
		if (gameState.gamePlaying) {
			gameState.pipes.forEach(pipe => {
				pipe[0] -= gameState.speed;
				drawPipe(pipe);
				updateScoreAndPipes(pipe);
			});
		}

		// Bird rendering
		drawBird();

		// Score display
		updateScoreDisplay();
	}

	window.requestAnimationFrame(render);
};

function drawPipe(pipe) {
	const pipeBodyImg = images.pipeBodyImg;
	const pipeEndImg = images.pipeEndImg;

	// Original dimensions of the pipe end image
	const originalEndWidth = 20; // original width of pipeEnd.png
	const originalEndHeight = 9; // original height of pipeEnd.png

	// Calculate scaled height for the pipe end
	const scaledEndHeight = gameState.pipeWidth / originalEndWidth * originalEndHeight;

	// Disable image smoothing
	ctx.imageSmoothingEnabled = false;
	// Draw top pipe
	let topPipeBodyHeight = pipe[1] - scaledEndHeight;
	for (let y = 0; y < topPipeBodyHeight; y += pipeBodyImg.height) {
		ctx.drawImage(pipeBodyImg, pipe[0], y, gameState.pipeWidth, Math.min(pipeBodyImg.height, topPipeBodyHeight - y));
	}
	ctx.drawImage(pipeEndImg, pipe[0], topPipeBodyHeight, gameState.pipeWidth, scaledEndHeight);

	// Draw bottom pipe
	let bottomPipeBodyStartY = pipe[1] + gameState.pipeGap;
	let bottomPipeBodyHeight = canvas.height - bottomPipeBodyStartY - scaledEndHeight;

	// Draw the end of the bottom pipe
	ctx.drawImage(pipeEndImg, pipe[0], bottomPipeBodyStartY, gameState.pipeWidth, scaledEndHeight);

	// Draw the body of the bottom pipe (repeated)
	for (let y = bottomPipeBodyStartY + scaledEndHeight; y < canvas.height; y += pipeBodyImg.height) {
		ctx.drawImage(pipeBodyImg, pipe[0], y, gameState.pipeWidth, Math.min(pipeBodyImg.height, canvas.height - y));
	}
}

// Draw the bird
function drawBird() {
	const scalingFactor = 4; // Example: scale by 4x
	ctx.save(); // Save the current state of the canvas
	const birdCenterX = gameState.cTenth + (gameState.birdSize[0] * scalingFactor) / 2;
	const birdCenterY = gameState.flyHeight + (gameState.birdSize[1] * scalingFactor) / 2;
	ctx.translate(birdCenterX, birdCenterY); // Translate to bird's center

	let rotation;
	if (gameState.gamePlaying) {
		rotation = Math.min(Math.max(gameState.flight / 20, -Math.PI / 4), Math.PI / 4);
		clickScreen.style.display = "none";
	} else {
		rotation = 0; // Face forward when game is not playing
		clickScreen.style.display = "block";
	}
	ctx.rotate(rotation); // Rotate based on flight

	// Disable image smoothing for a crisp, pixel-art look
	ctx.imageSmoothingEnabled = false;

	// Scale bird image by an integer factor
	const scaledWidth = gameState.birdSize[0] * scalingFactor;
	const scaledHeight = gameState.birdSize[1] * scalingFactor;
	ctx.drawImage(images.birdImg, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

	ctx.restore(); // Restore the canvas state

	// Bird physics
	if (gameState.gamePlaying) {
		gameState.flight += gameState.gravity;
		gameState.flyHeight = Math.min(gameState.flyHeight + gameState.flight, canvas.height - scaledHeight);
	} else {
		gameState.flyHeight = (canvas.height / 2) - (scaledHeight / 2);
	}
}

// Update score and manage pipes
function updateScoreAndPipes(pipe) {
	// Pipe moving
	if (pipe[0] <= -gameState.pipeWidth) {
		gameState.currentScore++;
		gameState.bestScore = Math.max(gameState.bestScore, gameState.currentScore);
		localStorage.setItem("bestScore", gameState.bestScore);
		gameState.pipes = [...gameState.pipes.slice(1), [gameState.pipes[gameState.pipes.length - 1][0] + gameState.pipeGap + gameState.pipeWidth, pipeLoc()]];
	}

	const scalingFactor = 4; // Same scaling factor as used in drawBird
	const scaledBirdWidth = gameState.birdSize[0] * scalingFactor;
	const scaledBirdHeight = gameState.birdSize[1] * scalingFactor;

	// Collision detection
	if (
		pipe[0] <= gameState.cTenth + scaledBirdWidth &&
		pipe[0] + gameState.pipeWidth >= gameState.cTenth
	) {
		// Check collision with top pipe
		const topPipeCollision = gameState.flyHeight <= pipe[1];
		// Check collision with bottom pipe
		const bottomPipeCollision = gameState.flyHeight + scaledBirdHeight >= pipe[1] + gameState.pipeGap;

		if (topPipeCollision || bottomPipeCollision) {
			gameState.gamePlaying = false;
			console.log("DIED!", gameState.currentScore, gameState.bestScore);
			fetch('/api/score', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'score': gameState.currentScore,
				},
			}).then(res => {
				console.log(res);
			}).catch(error => {
				console.error('Fetch error:', error);
			});
			setup(); // Reset the game
		}
	}
}

// Update the score display
function updateScoreDisplay() {
	document.getElementById('bestScore').textContent = `Best: ${gameState.bestScore}`;
	document.getElementById('currentScore').textContent = `Current: ${gameState.currentScore}`;
}

function colorIndex(letter) {
	let position = letter.toLowerCase().charCodeAt(0) - 96;
	return (position - 1) % 13 + 1;
}

if (username == null) {
	document.getElementById('prompt').style.display = "block";
} else {
	document.getElementById('game').style.display = "flex";

	fetch('/api/name', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Username': username,
		},
	}).then(res => {
		console.log(res);
		if (res.status == 200) {
			gameState.color = colorIndex(res.headers.get('Color') || res.headers.get('color'));
			images.birdImg.src = `./images/birds/bird-${gameState.color}.png`;
			localStorage.setItem("username", username);
			document.getElementById('prompt').style.display = "none";
			document.getElementById('game').style.display = "flex";
			launch();
		} else {
			window.location.reload();
		}
	}).catch(error => {
		console.error('Fetch error:', error);
		window.location.reload();
	});

	launch();
}

function launch() {
	if (launched) return;
	launched = true;

	document.getElementById("nameDisplay").textContent = "Playing as: "+username;

	// Event listeners
	setTimeout(() => {
		document.addEventListener('contextmenu', event => event.preventDefault());
		window.addEventListener('resize', resizeCanvas);
		document.addEventListener('keydown', e => {
			if (e.code === 'Space') {
				gameState.flight = gameState.jump;
			}
		});
		document.addEventListener('touchstart', (event) => {
			if (!gameState.touchActive) {
				event.preventDefault();
				gameState.gamePlaying = true;
				gameState.flight = gameState.jump;
				gameState.touchActive = true;
				touchEventTriggered = true;

				// Reset the flag after a delay
				setTimeout(() => {
					touchEventTriggered = false;
				}, 500); // Adjust the timeout as needed
			}
		});
		document.addEventListener('touchend', () => {
			gameState.touchActive = false;
		});
		document.addEventListener('mousedown', (event) => {
			if (!touchEventTriggered) {
				gameState.gamePlaying = true;
				gameState.flight = gameState.jump;
			}
		});


		// Initial setup
		resizeCanvas();
		setup();
	}, 1);
}

document.getElementById('submit').addEventListener('click', () => {
	username = document.getElementById('username').value;
	if (username.length == 0) return;

	fetch('/api/name', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Username': username,
		},
	}).then(res => {
		console.log(res);
		if (res.status == 200) {
			localStorage.setItem("username", username);
			document.getElementById('prompt').style.display = "none";
			document.getElementById('game').style.display = "flex";
			launch();
		} else {
			window.location.reload();
		}
	}).catch(error => {
		console.error('Fetch error:', error);
		window.location.reload();
	});
});

// input type event listener, only allow letters and numbers
document.getElementById('username').addEventListener('input', () => {
	const input = document.getElementById('username');
	input.value = input.value.replace(/[^a-z0-9]/gi, '');
	if (input.value.length > 0) {
		document.getElementById('submit').style.opacity = "1";
	} else {
		document.getElementById('submit').style.opacity = "0.1";
	}
});
