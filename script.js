// Jump Point Search Visualizer
const grid = document.getElementById("grid");
const rows = 25, cols = 45;
grid.style.gridTemplateColumns = `repeat(${cols}, 24px)`;

let startNode = null, endNode = null;
let isMouseDown = false, mode = "wall";
const nodes = [];

let exploredCount = 0;
let pathLength = 0;
let SPEED = 15;

const exploredEl = document.getElementById("explored");
const pathLenEl = document.getElementById("pathLength");
const speedRange = document.getElementById("speedRange");
const speedLabel = document.getElementById("speedLabel");

// ---------- GRID CREATION ----------
for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = r;
        cell.dataset.col = c;

        cell.addEventListener("mousedown", () => handleCellClick(cell));
        cell.addEventListener("mouseenter", () => {
            if (!isMouseDown) return;
            if (mode === "wall") cell.classList.add("wall");
            else if (mode === "erase") cell.classList.remove("wall");
        });

        grid.appendChild(cell);
        row.push(cell);
    }
    nodes.push(row);
}

document.body.addEventListener("mousedown", () => (isMouseDown = true));
document.body.addEventListener("mouseup", () => (isMouseDown = false));

// ---------- TOOL BUTTONS ----------
document.getElementById("tool-start").onclick = () => setMode("start");
document.getElementById("tool-goal").onclick = () => setMode("goal");
document.getElementById("tool-wall").onclick = () => setMode("wall");
document.getElementById("tool-erase").onclick = () => setMode("erase");
document.getElementById("run").onclick = runAStar;
document.getElementById("clear-path").onclick = clearPath;
document.getElementById("clear-all").onclick = clearAll;

function setMode(m) {
    mode = m;
    document.querySelectorAll(".tool").forEach(b => b.classList.remove("active"));
    document.getElementById(`tool-${m}`).classList.add("active");
}

speedRange.addEventListener("input", e => {
    SPEED = +e.target.value;
    speedLabel.textContent = `${SPEED} ms`;
});

// ---------- CELL INTERACTION ----------
function handleCellClick(cell) {
    if (mode === "start") {
        if (startNode) startNode.classList.remove("start");
        startNode = cell;
        cell.classList.remove("end", "wall");
        cell.classList.add("start");
    } else if (mode === "goal") {
        if (endNode) endNode.classList.remove("end");
        endNode = cell;
        cell.classList.remove("start", "wall");
        cell.classList.add("end");
    } else if (mode === "wall") {
        cell.classList.toggle("wall");
    } else if (mode === "erase") {
        cell.classList.remove("wall");
    }
}

// ---------- JPS PATHFINDING ----------
function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

async function runAStar() {
    if (!startNode || !endNode) {
        alert("Please set Start and Goal first!");
        return;
    }

    clearPath();
    exploredCount = 0;
    pathLength = 0;

    const start = { row: +startNode.dataset.row, col: +startNode.dataset.col };
    const goal = { row: +endNode.dataset.row, col: +endNode.dataset.col };

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const key = (r, c) => `${r},${c}`;

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            gScore.set(key(r, c), Infinity);
            fScore.set(key(r, c), Infinity);
        }

    gScore.set(key(start.row, start.col), 0);
    fScore.set(key(start.row, start.col), heuristic(start, goal));

    while (openSet.length > 0) {
        openSet.sort((a, b) => fScore.get(key(a.row, a.col)) - fScore.get(key(b.row, b.col)));
        const current = openSet.shift();

        const cell = nodes[current.row][current.col];
        if (cell !== startNode && cell !== endNode) {
            cell.classList.add("visited");
            exploredCount++;
            exploredEl.textContent = exploredCount;
        }
        await sleep(SPEED);

        if (current.row === goal.row && current.col === goal.col) {
            reconstructPath(cameFrom, current);
            pathLenEl.textContent = pathLength;
            return;
        }

        for (const neighbor of getNeighbors(current)) {
            const tentativeG = gScore.get(key(current.row, current.col)) + 1;
            if (tentativeG < gScore.get(key(neighbor.row, neighbor.col))) {
                cameFrom.set(key(neighbor.row, neighbor.col), current);
                gScore.set(key(neighbor.row, neighbor.col), tentativeG);
                fScore.set(key(neighbor.row, neighbor.col), tentativeG + heuristic(neighbor, goal));
                if (!openSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    alert("No path found (fully blocked by walls).");
}

function getNeighbors(node) {
    const dirs = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 1 },
    ];
    const res = [];
    for (const { dr, dc } of dirs) {
        const nr = node.row + dr, nc = node.col + dc;
        if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) {
            if (!nodes[nr][nc].classList.contains("wall")) res.push({ row: nr, col: nc });
        }
    }
    return res;
}

function reconstructPath(cameFrom, current) {
    const key = (r, c) => `${r},${c}`;
    const path = [];
    while (cameFrom.has(key(current.row, current.col))) {
        path.push(current);
        current = cameFrom.get(key(current.row, current.col));
    }
    path.reverse();

    for (const p of path) {
        const cell = nodes[p.row][p.col];
        if (cell !== startNode && cell !== endNode) cell.classList.add("path");
        pathLength++;
        pathLenEl.textContent = pathLength;
    }
}

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// ---------- UTILITIES ----------
function clearPath() {
    for (const row of nodes)
        for (const cell of row)
            cell.classList.remove("visited", "path");
    exploredEl.textContent = "0";
    pathLenEl.textContent = "0";
}

function clearAll() {
    for (const row of nodes)
        for (const cell of row)
            cell.className = "cell";
    startNode = null;
    endNode = null;
    exploredEl.textContent = "0";
    pathLenEl.textContent = "0";
}