const game = document.getElementById('game');
const scoreboardContent = document.getElementById('scoreboardContent');
const end = document.getElementById('end');
const windowWidth = window.innerWidth;

function colorIndex(letter) {
	let position = letter.toLowerCase().charCodeAt(0) - 96;
	return (position - 1) % 13 + 1;
}

function realColor(index) {
	switch (index) {
		case 1:
			return '#16a9ea';
		case 2:
			return '#18eae4';
		case 3:
			return '#16ea9d';
		case 4:
			return '#1ee915';
		case 5:
			return '#aaea17';
		case 6:
			return '#63ea15';
		case 7:
			return '#ea5415';
		case 8:
			return '#ea151f';
		case 9:
			return '#ea17ad';
		case 10:
			return '#e015ea';
		case 11:
			return '#ea151f';
		case 12:
			return '#192aad';
		case 13:
			return '#17afea';
		default:
			return '#16a9ea';
	}
}

function createBird(x, y, uid) {
	const bird = document.createElement('img');

	const colorNum = uid ? colorIndex(uid[0]) : randomBetween(1, 13);

	bird.src = '../images/birds/bird-'+colorNum+'.png';
	bird.style.position = 'absolute';
	bird.style.left = x + 'px';
	bird.style.top = y + 'px';
	bird.style.width = '80px';
	bird.style.transition = 'left 1s ease-in-out, top 1s ease-in-out';
	bird.id = 'bird-' + uid;

	// Apply the jumping animation
	bird.style.animation = 'jump 0.5s ease-in-out infinite';

	game.appendChild(bird);
}

function randomBetween(a, b) {
	return Math.floor(Math.random() * (b - a + 1) + a);
}

// for(let i = 0; i < 200; i++) {
// 	const pos_x = randomBetween(50, 100);
// 	const n = (window.innerHeight-370)/2;
// 	const pos_y = window.innerHeight/2 - 40 + randomBetween(-n+80, n);
// 	setTimeout(() => createBird(pos_x, pos_y), i * 10);
// }

let bestScore = 0;

function updateBirds(players) {
	// find the best score
	players.forEach(player => {
		if (player.score > bestScore) {
			bestScore = player.score;
		}
	});

	players.forEach((player, i) => {
		const bird = document.getElementById('bird-' + player.uid);
		if (bird) {
			// get this birds percentage of the best score
			const percent = player.score / bestScore;
			const max = windowWidth-550;
			const pos_x = max * percent +50;
			const n = (window.innerHeight-370)/2;
			const pos_y = window.innerHeight/2 - 40 + randomBetween(-n+80, n);
			if (player.score > 0) bird.style.left = pos_x + 'px';
			bird.style.top = pos_y + 'px';
		} else {
			const pos_x = randomBetween(50, 200);
			const n = (window.innerHeight-370)/2;
			const pos_y = window.innerHeight/2 - 40 + randomBetween(-n+80, n);
			setTimeout(() => createBird(pos_x, pos_y, player.uid), i * 100);
		}
	});
}

function getPlayers() {
	fetch('/api/players', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
	})
		.then(response => response.json())
		.then(response => {
			scoreboardContent.innerHTML = '';
			console.log(response);
			console.log("player count:", response.length)
			end.innerHTML = "Background from Freepik - " + (response.length == 0 ? 'No birds yet' : response.length == 1 ? '1 bird' : response.length + ' birds');

			updateBirds(response);
			response.forEach((player, i) => {
				const playerElem = `<div class="player" ${i==0 ? 'style="padding-left: 15px;"' : ''}>
					${i == 0 ? '<img src="trophy.png"/>' : ''}
					<h3 style="color: ${realColor(colorIndex(player.uid[0]))};">${player.username}</h3>
					<p id="score1">${player.score}</p>
				</div>`;

				scoreboardContent.innerHTML += playerElem;
			});
			setTimeout(() => {
				getPlayers();
			}, 1000);
		})
		.catch(error => {
			console.log(error);
			setTimeout(() => {
				getPlayers();
			}, 1000);
		});
}

getPlayers();
