document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const board = document.getElementById('game-board');
    const controlsPanel = document.getElementById('controls-panel');
    const playerContainer = document.getElementById('player-container');
    const slContainer = document.getElementById('snakes-ladders-container');

    // Modals
    const mainMenuModal = document.getElementById('main-menu-modal');
    const onlineModal = document.getElementById('online-modal');
    const localSetupModal = document.getElementById('local-setup-modal');
    const computerSetupModal = document.getElementById('computer-setup-modal');
    const waitingModal = document.getElementById('waiting-modal');
    const winnerModal = document.getElementById('winner-modal');

    // Buttons
    const playOnlineBtn = document.getElementById('play-online-btn');
    const playComputerBtn = document.getElementById('play-computer-btn');
    const playLocalBtn = document.getElementById('play-local-btn');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const startLocalGameBtn = document.getElementById('start-local-game-btn');
    const startComputerGameBtn = document.getElementById('start-computer-game-btn');
    const startGameNowBtn = document.getElementById('start-game-now-btn');
    const rollDiceBtn = document.getElementById('rollDiceBtn');

    // Inputs
    const createNameInput = document.getElementById('create-name-input');
    const joinNameInput = document.getElementById('join-name-input');
    const roomCodeInput = document.getElementById('room-code-input');
    const numLocalPlayersSelect = document.getElementById('num-local-players');
    const localPlayerInputsContainer = document.getElementById('local-player-inputs');
    const playerVsComputerNameInput = document.getElementById('player-vs-computer-name');

    // Displays
    const roomCodeDisplay = document.getElementById('room-code-display');
    const playerList = document.getElementById('player-list');
    const turnIndicatorEl = document.getElementById('turn-indicator');
    const diceEl = document.getElementById('dice');
    const diceResultEl = document.getElementById('dice-result');
    const winnerMessage = document.getElementById('winner-message');
    const hostControls = document.getElementById('host-controls');
    const guestMessage = document.getElementById('guest-message');

    // Firebase (from window object)
    const db = window.db;
    const { doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } = window.firebase;

    // --- Game State ---
    let gameMode = null; // 'online', 'local', 'computer'
    let players = [];
    let turn = 0;
    let tilePositions = [];
    
    // Online-specific state
    let currentRoomCode = null;
    let localPlayerName = null;
    let isHost = false;
    let unsubscribe;

    const playerConfig = [
        { color: 'bg-red-500', glow: '#f87171' },
        { color: 'bg-blue-500', glow: '#60a5fa' },
        { color: 'bg-yellow-400', glow: '#facc15' },
        { color: 'bg-purple-500', glow: '#c084fc' }
    ];

    const snakesAndLadders = {
        95: { end: 75, type: 'snake' }, 93: { end: 68, type: 'snake' },
        87: { end: 24, type: 'snake' }, 64: { end: 60, type: 'snake' }, 62: { end: 19, type: 'snake' },
        47: { end: 26, type: 'snake' }, 16: { end: 6, type: 'snake' },
        1: { end: 38, type: 'ladder' }, 4: { end: 14, type: 'ladder' }, 9: { end: 31, type: 'ladder' },
        21: { end: 42, type: 'ladder' }, 28: { end: 84, type: 'ladder' }, 36: { end: 44, type: 'ladder' },
        51: { end: 67, type: 'ladder' }, 71: { end: 91, type: 'ladder' }, 80: { end: 99, type: 'ladder' }
    };

    // --- Main Menu Logic ---
    const selectGameMode = (mode) => {
        gameMode = mode;
        mainMenuModal.classList.add('hidden');
        if (mode === 'online') onlineModal.classList.remove('hidden');
        if (mode === 'local') {
            localSetupModal.classList.remove('hidden');
            updateLocalPlayerInputs();
        }
        if (mode === 'computer') computerSetupModal.classList.remove('hidden');
    };

    // --- Local Game Setup ---
    const updateLocalPlayerInputs = () => {
        const num = numLocalPlayersSelect.value;
        localPlayerInputsContainer.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Player ${i + 1} Name`;
            input.id = `local-player-name-${i}`;
            input.className = 'w-full p-2 border border-slate-300 rounded-lg';
            localPlayerInputsContainer.appendChild(input);
        }
    };

    const startLocalGame = () => {
        const num = numLocalPlayersSelect.value;
        players = [];
        for (let i = 0; i < num; i++) {
            const name = document.getElementById(`local-player-name-${i}`).value.trim() || `Player ${i + 1}`;
            players.push({ name, position: 0, ...playerConfig[i] });
        }
        localSetupModal.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        updateLocalGameBoard();
    };

    // --- Computer Game Setup ---
    const startComputerGame = () => {
        const playerName = playerVsComputerNameInput.value.trim() || "Player 1";
        players = [
            { name: playerName, position: 0, ...playerConfig[0] },
            { name: "Computer", position: 0, ...playerConfig[1] }
        ];
        computerSetupModal.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        updateLocalGameBoard();
    };

    // --- Online Game Logic ---
    const createGame = async () => {
        localPlayerName = createNameInput.value.trim();
        if (!localPlayerName) return alert("Please enter your name.");
        isHost = true;
        currentRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameRef = doc(db, "games", currentRoomCode);
        const newPlayer = { name: localPlayerName, position: 0, ...playerConfig[0] };
        await setDoc(gameRef, {
            status: "waiting", players: [newPlayer], turn: 0, diceValue: null, winner: null, createdAt: serverTimestamp(), host: localPlayerName,
        });
        listenToGameUpdates(currentRoomCode);
    };

    const joinGame = async () => {
        localPlayerName = joinNameInput.value.trim();
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (!localPlayerName || !roomCode) return alert("Please enter your name and a room code.");
        const gameRef = doc(db, "games", roomCode);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) return alert("Game not found.");
        const gameData = gameSnap.data();
        if (gameData.players.length >= 4) return alert("This game room is full.");
        if (gameData.status !== 'waiting') return alert("This game has already started.");
        currentRoomCode = roomCode;
        const newPlayer = { name: localPlayerName, position: 0, ...playerConfig[gameData.players.length] };
        await updateDoc(gameRef, { players: arrayUnion(newPlayer) });
        listenToGameUpdates(roomCode);
    };

    const startGameNow = async () => {
        if (!isHost) return;
        const gameRef = doc(db, "games", currentRoomCode);
        await updateDoc(gameRef, { status: "active" });
    };

    const listenToGameUpdates = (roomCode) => {
        onlineModal.classList.add('hidden');
        waitingModal.classList.remove('hidden');
        roomCodeDisplay.textContent = roomCode;
        const gameRef = doc(db, "games", roomCode);
        unsubscribe = onSnapshot(gameRef, (docSnap) => {
            if (!docSnap.exists()) {
                alert("The game was deleted.");
                location.reload();
                return;
            }
            const gameData = docSnap.data();
            updateOnlineUI(gameData);
        });
    };

    // --- UI Update Logic ---
    const updateOnlineUI = (gameData) => {
        playerList.innerHTML = '';
        gameData.players.forEach(p => {
            const el = document.createElement('div');
            el.className = 'bg-slate-100 p-2 rounded';
            el.textContent = p.name;
            playerList.appendChild(el);
        });

        if (isHost) {
            hostControls.classList.remove('hidden');
            guestMessage.classList.add('hidden');
            startGameNowBtn.disabled = gameData.players.length < 2 || gameData.players.length > 4;
        } else {
            hostControls.classList.add('hidden');
            guestMessage.classList.remove('hidden');
        }

        if (gameData.status === 'active') {
            waitingModal.classList.add('hidden');
            controlsPanel.classList.remove('hidden');
            updateGameBoard(gameData.players, gameData.turn, gameData.diceValue);
        }

        if (gameData.status === 'finished') {
            winnerMessage.textContent = `🎉 ${gameData.winner} Wins! �`;
            winnerModal.classList.remove('hidden');
            if (unsubscribe) unsubscribe();
        }
    };

    const updateLocalGameBoard = () => {
        updateGameBoard(players, turn, null);
    };

    const updateGameBoard = (currentPlayers, currentTurn, diceValue) => {
        const currentPlayer = currentPlayers[currentTurn];
        turnIndicatorEl.textContent = `${currentPlayer.name}'s Turn`;
        
        if (gameMode === 'online') {
            rollDiceBtn.disabled = currentPlayer.name !== localPlayerName;
        } else if (gameMode === 'computer') {
            rollDiceBtn.disabled = currentPlayer.name === 'Computer';
        } else { // local
            rollDiceBtn.disabled = false;
        }
        
        if(diceValue) diceResultEl.textContent = `Rolled a ${diceValue}!`;

        playerContainer.innerHTML = '';
        currentPlayers.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player';
            if (player.name === currentPlayer.name) playerEl.classList.add('active');
            
            const tokenEl = document.createElement('div');
            tokenEl.className = `player-token ${player.color}`;
            tokenEl.style.setProperty('--glow-color', player.glow);

            const labelEl = document.createElement('div');
            labelEl.className = 'player-label';
            labelEl.textContent = player.name;
            
            playerEl.appendChild(labelEl);
            playerEl.appendChild(tokenEl);
            playerContainer.appendChild(playerEl);
            movePlayer(playerEl, player.position, false);
        });
    };

    // --- Core Game Logic ---
    const rollDice = async () => {
        rollDiceBtn.disabled = true;
        const diceValue = await animateDiceRoll();
        
        if (gameMode === 'online') {
            await handleOnlineMove(diceValue);
        } else {
            await handleLocalMove(diceValue);
        }
    };

    const animateDiceRoll = () => {
        return new Promise(resolve => {
            diceResultEl.textContent = '';
            const randomX = (Math.floor(Math.random() * 4) + 4) * 360;
            const randomY = (Math.floor(Math.random() * 4) + 4) * 360;
            diceEl.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg)`;

            setTimeout(() => {
                const finalValue = Math.floor(Math.random() * 6) + 1;
                const rotations = {
                    1: 'rotateY(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
                    4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
                };
                diceEl.style.transform = `translateZ(-30px) ${rotations[finalValue]}`;
                diceResultEl.textContent = `Rolled a ${finalValue}!`;
                setTimeout(() => resolve(finalValue), 500);
            }, 1000);
        });
    };

    const handleOnlineMove = async (diceValue) => {
        const gameRef = doc(db, "games", currentRoomCode);
        const gameSnap = await getDoc(gameRef);
        const gameData = gameSnap.data();
        const currentPlayerIndex = gameData.turn;
        const currentPlayer = gameData.players[currentPlayerIndex];
        let newPos = calculateNewPosition(currentPlayer.position, diceValue);
        const updatedPlayers = [...gameData.players];
        updatedPlayers[currentPlayerIndex].position = newPos;
        const nextTurn = (currentPlayerIndex + 1) % gameData.players.length;
        const updates = { players: updatedPlayers, turn: nextTurn, diceValue: diceValue };
        if (newPos === 100) {
            updates.status = 'finished';
            updates.winner = currentPlayer.name;
        }
        await updateDoc(gameRef, updates);
    };

    const handleLocalMove = async (diceValue) => {
        const currentPlayer = players[turn];
        let newPos = calculateNewPosition(currentPlayer.position, diceValue);
        currentPlayer.position = newPos;
        
        if (newPos === 100) {
            winnerMessage.textContent = `🎉 ${currentPlayer.name} Wins! 🎉`;
            winnerModal.classList.remove('hidden');
            return;
        }

        turn = (turn + 1) % players.length;
        updateLocalGameBoard();

        if (gameMode === 'computer' && players[turn].name === 'Computer') {
            setTimeout(handleComputerTurn, 1500);
        }
    };
    
    const handleComputerTurn = async () => {
        const diceValue = await animateDiceRoll();
        await handleLocalMove(diceValue);
    };

    const calculateNewPosition = (currentPosition, diceValue) => {
        let newPos = Math.min(100, currentPosition + diceValue);
        if (snakesAndLadders[newPos]) {
            newPos = snakesAndLadders[newPos].end;
        }
        return newPos;
    };

    const movePlayer = (playerEl, toPos, animate) => {
        let targetX, targetY;
        if (toPos === 0) {
            targetX = board.clientWidth / 2;
            targetY = board.clientHeight + 30;
        } else {
            if (!tilePositions[toPos]) return;
            targetX = tilePositions[toPos].x;
            targetY = tilePositions[toPos].y;
        }
        if (playerEl) {
            if (!animate) playerEl.style.transition = 'none';
            playerEl.style.transform = `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)`;
            if (!animate) setTimeout(() => { if(playerEl) playerEl.style.transition = ''; }, 50);
        }
    };

    // --- Board Drawing ---
    const createBoard = () => {
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
                tilePositions[tileNum] = { x: rect.left - boardRect.left + rect.width / 2, y: rect.top - boardRect.top + rect.height / 2 };
            });
            drawSnakesAndLadders();
            board.appendChild(slContainer);
            board.appendChild(playerContainer);
        }, 100);
    };
    
    const getTileDisplayNumber = (index) => {
        const row = Math.floor((index - 1) / 10);
        const col = (index - 1) % 10;
        const num = (row % 2 === 0) ? 100 - row * 10 - col : 100 - row * 10 - (9 - col);
        return num;
    };

    const drawSnakesAndLadders = () => {
        slContainer.innerHTML = '';
        const boardWidth = board.clientWidth;
        const boardHeight = board.clientHeight;
        for (const start in snakesAndLadders) {
            const { end, type } = snakesAndLadders[start];
            if (!tilePositions[start] || !tilePositions[end]) continue;
            const startPos = tilePositions[start];
            const endPos = tilePositions[end];
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
    };

    // --- Initial Setup ---
    playOnlineBtn.addEventListener('click', () => selectGameMode('online'));
    playComputerBtn.addEventListener('click', () => selectGameMode('computer'));
    playLocalBtn.addEventListener('click', () => selectGameMode('local'));
    
    createGameBtn.addEventListener('click', createGame);
    joinGameBtn.addEventListener('click', joinGame);
    startGameNowBtn.addEventListener('click', startGameNow);
    startLocalGameBtn.addEventListener('click', startLocalGame);
    startComputerGameBtn.addEventListener('click', startComputerGame);
    rollDiceBtn.addEventListener('click', rollDice);
    numLocalPlayersSelect.addEventListener('change', updateLocalPlayerInputs);
    
    createBoard();
    window.addEventListener('resize', createBoard);
});
