const WINS_NEEDED = 3;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const XSVG = '<path d="M20 20L80 80M80 20L20 80"/>';
const OSVG = '<circle cx="50" cy="50" r="32"/>';
const STAR = '<polygon points="50,5 61,35 95,35 68,55 78,90 50,70 22,90 32,55 5,35 39,35"/>';
const ICON = {
    erase: '<circle cx="42" cy="60" r="32"/><path d="M62 32l10-12 7 6-10 12z"/><polygon points="84,2 88,13 99,15 90,22 93,33 84,27 75,33 78,22 69,15 80,13"/>',
    extra: '<path fill-rule="evenodd" d="M50 6L14 20v28c0 22 15 38 36 46 21-8 36-24 36-46V20zM34 50l8-8 6 6 18-18 8 8-26 26z"/>',
    double: '<path d="M6 18L40 50 6 82V62l14-12L6 38zM52 18L86 50 52 82V62l14-12L52 38z"/>'
};
const NAMES = { erase: "BOOM", extra: "SHIELD", double: "DOUBLE MOVE" };
const $ = id => document.getElementById(id);
let S = null, muted = false, ac = null;


/* ---------- sound ---------- */
function beep(f, d = .1, type = "square", v = .05, delay = 0) {
    if (muted) return;
    try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
        o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
    } catch (e) { }
}
const sfx = {
    place: p => beep(p === "X" ? 520 : 330, .1),
    vanish: () => beep(150, .2, "sawtooth"),
    power: () => { beep(300, .08, "square", .05, 0); beep(600, .08, "square", .05, .08); beep(900, .15, "square", .05, .16) },
    win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .18, "square", .05, i * .12)),
    draw: () => { beep(300, .2, "triangle"); beep(220, .3, "triangle", .05, .2) },
    click: () => beep(700, .05)
};
$("mute").onclick = () => { muted = !muted; $("mute").textContent = muted ? "🔇" : "🔊" };


/* ---------- decoration ---------- */
function initDecor() {
    const bg = $("bg");
    for (let i = 0; i < 14; i++) {
        const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        s.setAttribute("viewBox", "0 0 100 100");
        const isX = i % 2 === 0;
        s.style.cssText = `left:${Math.random() * 95}vw;animation-duration:${10 + Math.random() * 14}s;animation-delay:-${Math.random() * 20}s;color:${isX ? "var(--x)" : "var(--o)"};fill:none;stroke:currentColor;stroke-width:9;stroke-linecap:round`;
        s.innerHTML = isX ? XSVG : OSVG;
        bg.appendChild(s);
    }
    $("hero").innerHTML =
        `<svg viewBox="0 0 100 100" style="color:var(--x);fill:none;stroke:currentColor;stroke-width:11;stroke-linecap:round">${XSVG}</svg>` +
        `<svg viewBox="0 0 100 100" style="fill:#ffd400">${STAR}</svg>` +
        `<svg viewBox="0 0 100 100" style="color:var(--o);fill:none;stroke:currentColor;stroke-width:11">${OSVG}</svg>`;
    $("avX").style.cssText = "fill:none;stroke:currentColor;stroke-width:12;stroke-linecap:round"; $("avX").innerHTML = XSVG;
    $("avO").style.cssText = "fill:none;stroke:currentColor;stroke-width:12"; $("avO").innerHTML = OSVG;
    $("iconErase").innerHTML = ICON.erase; $("iconExtra").innerHTML = ICON.extra; $("iconDouble").innerHTML = ICON.double;
}
function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
}


/* ---------- game flow ---------- */
function newMatch() {
    S = { scores: { X: 0, O: 0 }, used: { X: null, O: null }, round: 1, replay: false };
    newRound();
}
function newRound() {
    Object.assign(S, { used: { X: null, O: null }, board: Array(9).fill(null), marks: { X: [], O: [] }, limit: { X: 3, O: 3 }, turn: "X", pending: null, doubleLeft: 0, over: false, last: -1, winLine: null });
    $("msg").textContent = "Player X, you’re up!";
    show("game");
    render();
}
function pips(p) {
    let h = "";
    for (let i = 0; i < WINS_NEEDED; i++) h += `<svg viewBox="0 0 100 100" class="${i < S.scores[p] ? "f" : ""}">${STAR}</svg>`;
    return h;
}
function render() {
    $("sx").textContent = S.scores.X; $("so").textContent = S.scores.O; $("rnd").textContent = S.round;
    $("pipX").innerHTML = pips("X"); $("pipO").innerHTML = pips("O");
    ["X", "O"].forEach(p => { $("pl" + p).classList.toggle("on", S.turn === p && !S.over); $("p" + p.toLowerCase()).classList.toggle("on", S.turn === p && !S.over) });
    $("turn").innerHTML = S.over ? "" : `<span style="color:var(--${S.turn.toLowerCase()});text-shadow:0 0 10px var(--${S.turn.toLowerCase()})">▶ PLAYER ${S.turn}</span>`;
    const b = $("board"); b.innerHTML = ""; b.dataset.t = S.turn;
    S.board.forEach((v, i) => {
        const c = document.createElement("div"); c.className = "cell";
        if (v) {
            c.classList.add(v);
            c.innerHTML = `<svg viewBox="0 0 100 100">${v === "X" ? XSVG : OSVG}</svg>`;
            const m = S.marks[v];
            if (i === S.last) c.classList.add("pop");
            if (m.length >= S.limit[v] && m[0] === i && !S.over) c.classList.add("fading");
            if (S.pending === "erase" && v !== S.turn) c.classList.add("target");
        }
        if (S.winLine && S.winLine.includes(i)) c.classList.add("win");
        c.onclick = () => clickCell(i);
        b.appendChild(c);
    });
    ["X", "O"].forEach(p => {
        const box = $("p" + p.toLowerCase());
        box.innerHTML = `<h3>PLAYER ${p}</h3>`;
        Object.keys(ICON).forEach(k => {
            const btn = document.createElement("button");
            const used = S.used[p] === k;
            btn.className = used ? "used" : "";
            btn.innerHTML = `<svg viewBox="0 0 100 100">${ICON[k]}</svg>${NAMES[k]}`;
            btn.disabled = !!S.used[p] || S.turn !== p || S.over || !!S.pending;
            btn.onclick = () => usePower(k);
            box.appendChild(btn);
        });
    });
}
function usePower(k) {
    const p = S.turn;
    if (S.used[p]) return;
    if (k === "erase") {
        if (!S.marks[p === "X" ? "O" : "X"].length) { $("msg").textContent = "Nothing to erase yet!"; return; }
        S.used[p] = "erase"; S.pending = "erase";
        $("msg").textContent = "💣 BOOM! Tap an enemy mark to blow it up!";
    } else if (k === "extra") {
        S.used[p] = "extra"; S.limit[p] = 4;
        $("msg").textContent = `🛡️ Player ${p} can keep 4 marks!`;
    } else {
        S.used[p] = "double"; S.doubleLeft = 1;
        $("msg").textContent = `⚡ Player ${p} gets two moves!`;
    }
    sfx.power(); render();
}
function clickCell(i) {
    if (S.over) return;
    const p = S.turn, opp = p === "X" ? "O" : "X";
    if (S.pending === "erase") {
        if (S.board[i] !== opp) return;
        S.board[i] = null; S.marks[opp] = S.marks[opp].filter(x => x !== i);
        S.pending = null; S.last = -1;
        document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 420);
        sfx.vanish();
        $("msg").textContent = "💥 BOOM! Now place your mark.";
        render(); return;
    }
    if (S.board[i]) return;
    S.board[i] = p; S.marks[p].push(i); S.last = i; sfx.place(p);
    if (S.marks[p].length > S.limit[p]) {
        S.board[S.marks[p].shift()] = null;
        setTimeout(sfx.vanish, 90);
    }
    const line = LINES.find(l => l.every(c => S.board[c] === p));
    if (line) { S.winLine = line; return endRound(p); }
    if (S.board.every(v => v)) return endRound(null);
    if (S.doubleLeft > 0) { S.doubleLeft--; $("msg").textContent = "⚡ Place your second mark!"; }
    else { S.turn = opp; $("msg").textContent = `Player ${opp}, your move!`; }
    render();
}
function endRound(w) {
    S.over = true;
    const icon = $("rIcon");
    if (!w) {
        S.replay = true; sfx.draw();
        icon.style.cssText = "fill:#ffd400"; icon.innerHTML = '<path d="M20 55c10-14 20-14 30 0s20 14 30 0v12c-10 14-20 14-30 0s-20-14-30 0z"/><circle cx="35" cy="30" r="7"/><circle cx="65" cy="30" r="7"/>';
        $("rTitle").textContent = "DRAW!";
        $("rScore").textContent = "No points. Round will be replayed.";
    } else {
        S.scores[w]++; S.replay = false; sfx.win();
        const c = `var(--${w.toLowerCase()})`;
        icon.style.cssText = `color:${c};fill:none;stroke:currentColor;stroke-width:11;stroke-linecap:round`;
        icon.innerHTML = w === "X" ? XSVG : OSVG;
        $("rTitle").innerHTML = `<span style="color:${c};text-shadow:0 0 12px ${c}">PLAYER ${w}</span><br>WINS THE ROUND!`;
        $("rScore").innerHTML = `<span style="color:var(--x)">X: ${S.scores.X}</span> &nbsp;|&nbsp; <span style="color:var(--o)">O: ${S.scores.O}</span>`;
        if (S.scores[w] === WINS_NEEDED) { render(); return setTimeout(() => finalScreen(w), 1100); }
    }
    render();
    setTimeout(() => show("round"), 1100);
}
function finalScreen(w) {
    const c = `var(--${w.toLowerCase()})`;
    $("fTitle").innerHTML = `<span style="color:${c};text-shadow:0 0 14px ${c}">PLAYER ${w} WINS<br>THE MATCH!</span>`;
    $("fScore").innerHTML = `FINAL<br><span style="color:var(--x)">X: ${S.scores.X}</span> &nbsp;|&nbsp; <span style="color:var(--o)">O: ${S.scores.O}</span>`;
    show("final"); confetti();
    setTimeout(confetti, 1500);
}
function confetti() {
    const cols = ["#ff13a9", "#a700fe", "#ffd400", "#00f0ff", "#fff"];
    for (let i = 0; i < 90; i++) {
        const d = document.createElement("div"); d.className = "confetti";
        d.style.left = Math.random() * 100 + "vw"; d.style.background = cols[i % cols.length];
        d.style.animationDuration = (2 + Math.random() * 2) + "s"; d.style.animationDelay = Math.random() * .8 + "s";
        document.body.appendChild(d); setTimeout(() => d.remove(), 5000);
    }
}
$("startBtn").onclick = () => { sfx.click(); newMatch() };
$("howBtn").onclick = () => { sfx.click(); $("modal").classList.add("show") };
$("closeBtn").onclick = () => $("modal").classList.remove("show");
$("nextBtn").onclick = () => { sfx.click(); if (!S.replay) S.round++; newRound() };
$("backBtn").onclick = () => { sfx.click(); S = null; show("welcome") };
initDecor();