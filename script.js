document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board');
    const numPlayersSelect = document.getElementById('numPlayers');
    const playerInputsContainer = document.getElementById('player-inputs');
    const startGameBtn = document.getElementById('start-game-btn');
    const setupModal = document.getElementById('setup-modal');
    const controlsPanel = document.getElementById('controls-panel');
    const rollDiceBtn = document.getElementById('rollDiceBtn');
    const diceEl = document.getElementById('dice');
    const diceResultEl = document.getElementById('dice-result');
    const turnIndicatorEl = document.getElementById('turn-indicator');
    const playerContainer = document.getElementById('player-container');
    const slContainer = document.getElementById('snakes-ladders-container');

    let players = [];
    let turn = 0;
    let tilePositions = [];

    const playerConfig = [
        { color: 'bg-red-500', glow: '#f87171' },
        { color: 'bg-blue-500', glow: '#60a5fa' },
        { color: 'bg-yellow-400', glow: '#facc15' },
        { color: 'bg-purple-500', glow: '#c084fc' }
    ];

    const snakesAndLadders = {
        // REMOVED: 98: { end: 28, type: 'snake' },
        95: { end: 75, type: 'snake' }, 93: { end: 68, type: 'snake' },
        87: { end: 24, type: 'snake' }, 64: { end: 60, type: 'snake' }, 62: { end: 19, type: 'snake' },
        47: { end: 26, type: 'snake' }, 16: { end: 6, type: 'snake' },
        1: { end: 38, type: 'ladder' }, 4: { end: 14, type: 'ladder' }, 9: { end: 31, type: 'ladder' },
        21: { end: 42, type: 'ladder' }, 28: { end: 84, type: 'ladder' }, 36: { end: 44, type: 'ladder' },
        51: { end: 67, type: 'ladder' }, 71: { end: 91, type: 'ladder' }, 80: { end: 99, type: 'ladder' }
    };

    function createBoard() {
        board.innerHTML = ''; 
        tilePositions = [null]; 
        for (let i = 1; i <= 100; i++) {
            const tileEl = document.createElement('div');
            tileEl.classList.add('tile');
            const tileNumber = document.createElement('span');
            tileNumber.classList.add('tile-number');
            tileNumber.textContent = getTileDisplayNumber(i);
            tileEl.appendChild(tileNumber);
            board.appendChild(tileEl);
        }
        
        setTimeout(() => {
            const tiles = board.querySelectorAll('.tile');
            tiles.forEach((tile, index) => {
                const tileNum = getTileDisplayNumber(index + 1);
                const rect = tile.getBoundingClientRect();
                const boardRect = board.getBoundingClientRect();
                tilePositions[tileNum] = {
                    x: rect.left - boardRect.left + rect.width / 2,
                    y: rect.top - boardRect.top + rect.height / 2
                };
            });
            drawSnakesAndLadders();
            board.appendChild(slContainer);
            board.appendChild(playerContainer);
        }, 50);
    }
    
    function getTileDisplayNumber(index) {
        const row = Math.floor((index - 1) / 10);
        const col = (index - 1) % 10;
        let num;
        if (row % 2 === 0) {
            num = 100 - row * 10 - col;
        } else {
            num = 100 - row * 10 - (9 - col);
        }
        return num;
    }

    function drawSnakesAndLadders() {
        slContainer.innerHTML = '';
        const boardWidth = board.clientWidth;
        const boardHeight = board.clientHeight;

        for (const start in snakesAndLadders) {
            const { end, type } = snakesAndLadders[start];
            const startPos = tilePositions[start];
            const endPos = tilePositions[end];

            if(!startPos || !endPos) continue;

            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.classList.add(type);
            svg.setAttribute('viewBox', `0 0 ${boardWidth} ${boardHeight}`);
            svg.style.overflow = 'visible';

            if (type === 'ladder') {
                const LADDER_COLOR = '#a16207';
                const LADDER_WIDTH = 12;

                const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);

                const g = document.createElementNS(svgNS, 'g');

                const rail1 = document.createElementNS(svgNS, "line");
                rail1.setAttribute('x1', startPos.x - (LADDER_WIDTH / 2) * dy);
                rail1.setAttribute('y1', startPos.y + (LADDER_WIDTH / 2) * dx);
                rail1.setAttribute('x2', endPos.x - (LADDER_WIDTH / 2) * dy);
                rail1.setAttribute('y2', endPos.y + (LADDER_WIDTH / 2) * dx);
                rail1.setAttribute('stroke', LADDER_COLOR);
                rail1.setAttribute('stroke-width', '5');
                rail1.setAttribute('stroke-linecap', 'round');
                g.appendChild(rail1);

                const rail2 = document.createElementNS(svgNS, "line");
                rail2.setAttribute('x1', startPos.x + (LADDER_WIDTH / 2) * dy);
                rail2.setAttribute('y1', startPos.y - (LADDER_WIDTH / 2) * dx);
                rail2.setAttribute('x2', endPos.x + (LADDER_WIDTH / 2) * dy);
                rail2.setAttribute('y2', endPos.y - (LADDER_WIDTH / 2) * dx);
                rail2.setAttribute('stroke', LADDER_COLOR);
                rail2.setAttribute('stroke-width', '5');
                rail2.setAttribute('stroke-linecap', 'round');
                g.appendChild(rail2);

                const length = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
                const numRungs = Math.floor(length / 25);
                for (let i = 1; i <= numRungs; i++) {
                    const rungX = startPos.x + i * (endPos.x - startPos.x) / (numRungs + 1);
                    const rungY = startPos.y + i * (endPos.y - startPos.y) / (numRungs + 1);

                    const rung = document.createElementNS(svgNS, "line");
                    rung.setAttribute('x1', rungX - (LADDER_WIDTH / 2) * dy);
                    rung.setAttribute('y1', rungY + (LADDER_WIDTH / 2) * dx);
                    rung.setAttribute('x2', rungX + (LADDER_WIDTH / 2) * dy);
                    rung.setAttribute('y2', rungY - (LADDER_WIDTH / 2) * dx);
                    rung.setAttribute('stroke', LADDER_COLOR);
                    rung.setAttribute('stroke-width', '4');
                    rung.setAttribute('stroke-linecap', 'round');
                    g.appendChild(rung);
                }
                svg.appendChild(g);

            } else if (type === 'snake') {
                const SNAKE_COLOR = '#16a34a';
                const SNAKE_BELLY = '#a7f3d0';

                const g = document.createElementNS(svgNS, 'g');

                const path = document.createElementNS(svgNS, "path");
                const controlX = (startPos.x + endPos.x) / 2 + (startPos.x > endPos.x ? -1 : 1) * 30;
                const controlY = (startPos.y + endPos.y) / 2 + (Math.random() - 0.5) * 40;
                const d = `M ${startPos.x} ${startPos.y} Q ${controlX} ${controlY} ${endPos.x} ${endPos.y}`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', SNAKE_COLOR);
                path.setAttribute('stroke-width', '16');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                
                const bellyPath = path.cloneNode();
                bellyPath.setAttribute('stroke', SNAKE_BELLY);
                bellyPath.setAttribute('stroke-width', '8');
                bellyPath.setAttribute('stroke-dasharray', '5, 10');

                g.appendChild(path);
                g.appendChild(bellyPath);

                const head = document.createElementNS(svgNS, "circle");
                head.setAttribute('cx', startPos.x);
                head.setAttribute('cy', startPos.y);
                head.setAttribute('r', '12');
                head.setAttribute('fill', SNAKE_COLOR);
                g.appendChild(head);

                const angle = Math.atan2(controlY - startPos.y, controlX - startPos.x);
                const eye1X = startPos.x + 5 * Math.cos(angle + Math.PI / 2.5);
                const eye1Y = startPos.y + 5 * Math.sin(angle + Math.PI / 2.5);
                const eye2X = startPos.x + 5 * Math.cos(angle - Math.PI / 2.5);
                const eye2Y = startPos.y + 5 * Math.sin(angle - Math.PI / 2.5);

                const eye1 = document.createElementNS(svgNS, "circle");
                eye1.setAttribute('cx', eye1X);
                eye1.setAttribute('cy', eye1Y);
                eye1.setAttribute('r', '3');
                eye1.setAttribute('fill', 'white');
                g.appendChild(eye1);

                const eye2 = document.createElementNS(svgNS, "circle");
                eye2.setAttribute('cx', eye2X);
                eye2.setAttribute('cy', eye2Y);
                eye2.setAttribute('r', '3');
                eye2.setAttribute('fill', 'white');
                g.appendChild(eye2);
                
                const pupil1 = document.createElementNS(svgNS, "circle");
                pupil1.setAttribute('cx', eye1X + 0.5);
                pupil1.setAttribute('cy', eye1Y);
                pupil1.setAttribute('r', '1.5');
                pupil1.setAttribute('fill', 'black');
                g.appendChild(pupil1);
                
                const pupil2 = document.createElementNS(svgNS, "circle");
                pupil2.setAttribute('cx', eye2X + 0.5);
                pupil2.setAttribute('cy', eye2Y);
                pupil2.setAttribute('r', '1.5');
                pupil2.setAttribute('fill', 'black');
                g.appendChild(pupil2);

                svg.appendChild(g);
            }
            slContainer.appendChild(svg);
        }
    }

    function updatePlayerInputs() {
        const num = numPlayersSelect.value;
        playerInputsContainer.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Player ${i + 1} Name`;
            input.id = `player-name-${i}`;
            input.value = `Player ${i + 1}`;
            input.className = 'w-full p-2 border border-slate-300 rounded-lg';
            playerInputsContainer.appendChild(input);
        }
    }

    function startGame() {
        const num = numPlayersSelect.value;
        players = [];
        playerContainer.innerHTML = '';

        for (let i = 0; i < num; i++) {
            const name = document.getElementById(`player-name-${i}`).value || `Player ${i + 1}`;
            const playerEl = document.createElement('div');
            playerEl.className = 'player';
            
            const tokenEl = document.createElement('div');
            tokenEl.className = `player-token ${playerConfig[i].color}`;
            tokenEl.style.setProperty('--glow-color', playerConfig[i].glow);

            const labelEl = document.createElement('div');
            labelEl.className = 'player-label';
            labelEl.textContent = name;
            
            playerEl.appendChild(labelEl);
            playerEl.appendChild(tokenEl);
            playerContainer.appendChild(playerEl);

            players.push({ name, position: 0, ...playerConfig[i], playerEl });
        }
        
        setupModal.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        updateTurnIndicator();
        players.forEach((p, i) => movePlayer(i, 0, false));
    }

    function updateTurnIndicator() {
        turnIndicatorEl.textContent = `${players[turn].name}'s Turn`;
        players.forEach((p, i) => {
            p.playerEl.classList.toggle('active', i === turn);
        });
    }

    async function rollDice() {
        rollDiceBtn.disabled = true;
        diceResultEl.textContent = '';

        const randomX = (Math.floor(Math.random() * 4) + 4) * 360;
        const randomY = (Math.floor(Math.random() * 4) + 4) * 360;
        diceEl.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg)`;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const diceValue = Math.floor(Math.random() * 6) + 1;
        diceResultEl.textContent = `You rolled a ${diceValue}!`;
        
        const rotations = {
            1: 'rotateY(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
            4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
        };
        diceEl.style.transform = `translateZ(-30px) ${rotations[diceValue]}`;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const currentPlayer = players[turn];
        const newPos = Math.min(100, currentPlayer.position + diceValue);
        await movePlayer(turn, newPos, true);

        const finalCheck = snakesAndLadders[players[turn].position];
        if (finalCheck) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await movePlayer(turn, finalCheck.end, true);
        }

        if (players[turn].position === 100) {
            showWinner();
        } else {
            turn = (turn + 1) % players.length;
            updateTurnIndicator();
            rollDiceBtn.disabled = false;
        }
    }

    function movePlayer(playerIndex, toPos, animate) {
        return new Promise(resolve => {
            const player = players[playerIndex];
            player.position = toPos;

            let targetX, targetY;

            if (toPos === 0) {
                const boardWidth = board.clientWidth;
                targetX = (boardWidth / (players.length + 1)) * (playerIndex + 1);
                targetY = board.clientHeight + 30;
            } else {
                const pos = tilePositions[toPos];
                targetX = pos.x;
                targetY = pos.y;
            }

            if (player.playerEl) {
                if (!animate) {
                    player.playerEl.style.transition = 'none';
                }
                player.playerEl.style.transform = `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)`;
                if (!animate) {
                    setTimeout(() => {
                        if(player.playerEl) player.playerEl.style.transition = '';
                    }, 50);
                }
            }
            
            setTimeout(resolve, animate ? 400 : 0);
        });
    }

    function showWinner() {
        const winner = players[turn];
        const winnerModal = document.getElementById('winner-modal');
        document.getElementById('winner-message').textContent = `🎉 ${winner.name} Wins! 🎉`;
        winnerModal.classList.remove('hidden');
        setTimeout(() => winnerModal.querySelector('div').style.transform = 'scale(1)', 10);
    }

    // Initial setup
    numPlayersSelect.addEventListener('change', updatePlayerInputs);
    startGameBtn.addEventListener('click', startGame);
    rollDiceBtn.addEventListener('click', rollDice);
    
    createBoard();
    updatePlayerInputs();
    window.addEventListener('resize', () => {
        createBoard();
        if (players.length > 0) {
            players.forEach((p, i) => movePlayer(i, p.position, false));
        }
    });
});
