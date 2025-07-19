const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const tileSize = 60;
const boardSize = 10;
const positions = {};
let players = [];
let turn = 0;

const snakes = { 99: 7, 92: 35, 85: 57, 68: 32, 43: 22 };
const ladders = { 3: 38, 14: 70, 20: 41, 31: 84, 52: 88 };

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let number = 100;
  let leftToRight = true;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const actualCol = leftToRight ? col : boardSize - 1 - col;
      const x = actualCol * tileSize;
      const y = row * tileSize;

      ctx.fillStyle = (row + col) % 2 === 0 ? '#e4cda3' : '#b0d4c1';
      ctx.fillRect(x, y, tileSize, tileSize);

      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.fillText(number, x + 5, y + 15);

      positions[number] = [x + tileSize / 2, y + tileSize / 2];
      number--;
    }
    leftToRight = !leftToRight;
  }

  drawLines(ladders, 'green');
  drawLines(snakes, 'red');
}

function drawLines(map, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([5, 5]);

  for (let start in map) {
    const end = map[start];
    const [x1, y1] = positions[start];
    const [x2, y2] = positions[end];
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawPlayers() {
  players.forEach((player, index) => {
    if (player.position === null) return;
    const [x, y] = positions[player.position];
    ctx.beginPath();
    ctx.arc(x + index * 10 - 15, y + 15, 8, 0, 2 * Math.PI);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.stroke();
  });
}

function rollDice() {
  const dice = Math.floor(Math.random() * 6) + 1;
  document.getElementById('diceResult').innerText = `Rolled: ${dice}`;
  movePlayer(dice);
}

function movePlayer(dice) {
  const player = players[turn];
  if (player.position === null) {
    player.position = 0;
  }

  let newPos = player.position + dice;
  if (newPos <= 100) {
    player.position = newPos;

    // Snake or Ladder
    if (snakes[player.position]) {
      player.position = snakes[player.position];
    } else if (ladders[player.position]) {
      player.position = ladders[player.position];
    }
  }

  drawBoard();
  drawPlayers();

  if (player.position === 100) {
    setTimeout(() => {
      alert(`${player.name} wins!`);
      location.reload();
    }, 100);
    return;
  }

  turn = (turn + 1) % players.length;
  document.getElementById('currentPlayer').innerText = `Turn: ${players[turn].name}`;
}

function startGame() {
  const num = document.getElementById('numPlayers').value;
  if (num < 2 || num > 4) {
    alert('Enter between 2 and 4 players');
    return;
  }

  players = [];
  const colors = ['blue', 'orange', 'green', 'purple'];

  for (let i = 0; i < num; i++) {
    const name = prompt(`Enter name for Player ${i + 1}:`);
    players.push({ name, position: null, color: colors[i] });
  }

  turn = 0;
  drawBoard();
  drawPlayers();

  document.getElementById('player-setup').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  document.getElementById('currentPlayer').innerText = `Turn: ${players[turn].name}`;
}
