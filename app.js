// ============================================
// BINGO FF LIVE - Lógica de Vista de Equipo
// ============================================

let currentTeam = null;
let currentTeamColor = null;
let currentTeamEmoji = null;
let allObjectives = [];
let allTeams = [];
let unsubscribes = [];
let previousFirstPlace = null;
let lastCompletedCount = {};
let lastBingos = {};
let equiposInicioUnsub = null;

const FILAS = 6;
const COLUMNAS = 3;

function cargarEquiposInicio() {
    const grid = document.getElementById('teamsGrid');
    if (!grid) return;
    if (equiposInicioUnsub) equiposInicioUnsub();
    
    equiposInicioUnsub = db.collection('equipos').onSnapshot(snapshot => {
        const teams = [];
        snapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
        
        if (teams.length === 0) {
            grid.innerHTML = `<p style="color:#a0a0b0;text-align:center;grid-column:1/-1;padding:20px;">No hay equipos aún.<br>El administrador debe crearlos.</p>
                <a href="admin.html" class="team-btn admin-btn"><span class="team-icon">🔐</span>Administrador</a>`;
            return;
        }
        
        const getEmoji = (color) => {
            const c = color?.toLowerCase() || '';
            if (c.includes('ff4444') || c.includes('ff0000')) return '🔴';
            if (c.includes('4488ff') || c.includes('0000ff')) return '🔵';
            if (c.includes('44ff44') || c.includes('00ff00')) return '🟢';
            if (c.includes('ffd700') || c.includes('ffff00')) return '🟡';
            if (c.includes('ff8800')) return '🟠';
            if (c.includes('ff00ff')) return '🟣';
            if (c.includes('ffffff')) return '⚪';
            if (c.includes('000000')) return '⚫';
            return '🎯';
        };
        
        const getColorClass = (color) => {
            const c = color?.toLowerCase() || '';
            if (c.includes('ff4444') || c.includes('ff0000')) return 'red';
            if (c.includes('4488ff') || c.includes('0000ff')) return 'blue';
            if (c.includes('44ff44') || c.includes('00ff00')) return 'green';
            if (c.includes('ffd700') || c.includes('ffff00')) return 'yellow';
            return '';
        };
        
        grid.innerHTML = teams.map(team => {
            const emoji = getEmoji(team.color);
            const colorClass = getColorClass(team.color);
            return `<button class="team-btn ${colorClass}" onclick="selectTeam('${team.id}', '${emoji}', '${team.color || '#888'}')" style="border-color: ${team.color || '#888'}40;">
                <span class="team-icon">${emoji}</span>${team.nombre || team.id}</button>`;
        }).join('');
        
        grid.innerHTML += `<a href="admin.html" class="team-btn admin-btn"><span class="team-icon">🔐</span>Administrador</a>`;
    });
}

function selectTeam(teamId, emoji, color) {
    currentTeam = teamId; currentTeamColor = color; currentTeamEmoji = emoji;
    document.getElementById('modalTeamTitle').textContent = `${emoji} Unirse a ${teamId.charAt(0).toUpperCase() + teamId.slice(1)}`;
    document.getElementById('playerName').value = localStorage.getItem(`bingo_playerName_${teamId}`) || '';
    document.getElementById('playerUID').value = localStorage.getItem(`bingo_playerUID_${teamId}`) || '';
    document.getElementById('nameModal').classList.add('show');
    setTimeout(() => document.getElementById('playerName').focus(), 100);
}

function closeModal() { document.getElementById('nameModal').classList.remove('show'); }

function joinTeam() {
    const name = document.getElementById('playerName').value.trim();
    const uid = document.getElementById('playerUID').value.trim();
    if (!name) { alert('Por favor ingresa tu nombre'); return; }
    
    localStorage.setItem(`bingo_playerName_${currentTeam}`, name);
    localStorage.setItem(`bingo_playerUID_${currentTeam}`, uid);
    
    const teamRef = db.collection('equipos').doc(currentTeam);
    teamRef.get().then(doc => {
        if (doc.exists) return teamRef.update({ jugador_nombre: name, jugador_uid: uid });
        else return teamRef.set({ nombre: currentTeam.charAt(0).toUpperCase() + currentTeam.slice(1), color: currentTeamColor, puntos: 0, objetivos_completados: [], bingos_ganados: [], jugador_nombre: name, jugador_uid: uid });
    }).catch(err => console.error('Error:', err));
    
    document.getElementById('nameModal').classList.remove('show');
    showTeamView();
}

function showTeamView() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('teamView').style.display = 'block';
    document.getElementById('teamView').classList.add('active');
    document.getElementById('teamColorDot').style.background = currentTeamColor;
    document.getElementById('teamColorDot').style.color = currentTeamColor;
    document.getElementById('teamNameDisplay').textContent = `${currentTeamEmoji} ${currentTeam.charAt(0).toUpperCase() + currentTeam.slice(1)}`;
    setupTeamListeners();
}

function goHome() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    if (window.timerInterval) { clearInterval(window.timerInterval); window.timerInterval = null; }
    document.getElementById('teamView').style.display = 'none';
    document.getElementById('teamView').classList.remove('active');
    document.getElementById('homeScreen').style.display = 'block';
    currentTeam = null; allObjectives = []; allTeams = [];
    cargarEquiposInicio();
}

function setupTeamListeners() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    const tiempoEntrada = Date.now();
    
    unsubscribes.push(db.collection('objetivos').orderBy('orden', 'asc').onSnapshot(snapshot => {
        allObjectives = []; snapshot.forEach(doc => allObjectives.push({ id: doc.id, ...doc.data() }));
        renderBingoGrid();
    }));
    unsubscribes.push(db.collection('equipos').onSnapshot(snapshot => {
        allTeams = []; snapshot.forEach(doc => allTeams.push({ id: doc.id, ...doc.data() }));
        updateTeamInfo(); renderRanking(); checkForCompletion(); renderBingoGrid();
    }));
    unsubscribes.push(db.collection('partida').doc('actual').onSnapshot(doc => { if (doc.exists) updateTimer(doc.data()); }));
    unsubscribes.push(db.collection('notificaciones').orderBy('timestamp', 'desc').limit(5).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if ((data.timestamp?.toMillis() || 0) > tiempoEntrada) showToast(data.mensaje);
            }
        });
    }));
}

async function playerToggleObjective(objectiveId) {
    if (!currentTeam) return;
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (!teamData) return;
    const objective = allObjectives.find(o => o.id === objectiveId);
    if (!objective) return;
    
    let completedIds = [...(teamData.objetivos_completados || [])];
    let puntos = teamData.puntos || 0;
    let bingosGanados = [...(teamData.bingos_ganados || [])];
    
    if (completedIds.includes(objectiveId)) {
        if (!confirm(`¿Desmarcar "${objective.nombre}"? -${objective.puntos} pts`)) return;
        completedIds = completedIds.filter(id => id !== objectiveId);
        const basePoints = completedIds.reduce((sum, id) => sum + (allObjectives.find(o => o.id === id)?.puntos || 0), 0);
        const lines = calcularLineasCompletadas(completedIds);
        puntos = basePoints + lines.reduce((sum, l) => sum + l.puntos, 0);
        bingosGanados = [];
    } else {
        if (!confirm(`¿Encontraste "${objective.nombre}"? +${objective.puntos} pts`)) return;
        completedIds.push(objectiveId);
        puntos += (objective.puntos || 0);
        const prevLines = calcularLineasCompletadas(teamData.objetivos_completados || []);
        const newLines = calcularLineasCompletadas(completedIds);
        newLines.filter(nl => !prevLines.some(pl => pl.tipo === nl.tipo && pl.indice === nl.indice)).forEach(b => {
            puntos += b.puntos; bingosGanados.push(`${b.tipo}_${b.indice}_${Date.now()}`);
        });
    }
    
    try {
        await db.collection('equipos').doc(currentTeam).update({ objetivos_completados: completedIds, puntos, bingos_ganados: bingosGanados });
        await db.collection('notificaciones').add({ mensaje: `${completedIds.includes(objectiveId) ? '✅' : '❌'} ${teamData.nombre || currentTeam}: ${objective.nombre}`, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        showToast(`${completedIds.includes(objectiveId) ? '✅' : '❌'} "${objective.nombre}"`);
    } catch (error) { console.error('Error:', error); }
}

function renderBingoGrid() {
    const grid = document.getElementById('bingoGrid');
    if (!grid) return;
    grid.className = 'bingo-grid-3x6';
    if (allObjectives.length === 0) { grid.innerHTML = '<p style="color:#a0a0b0;text-align:center;padding:20px;">Cargando...</p>'; return; }
    
    const completedIds = (allTeams.find(t => t.id === currentTeam)?.objetivos_completados || []);
    const linesCompleted = calcularLineasCompletadas(completedIds);
    
    grid.innerHTML = allObjectives.map((obj, index) => {
        const isCompleted = completedIds.includes(obj.id);
        const fila = Math.floor(index / COLUMNAS), columna = index % COLUMNAS;
        return `<div class="bingo-item ${isCompleted ? 'completed' : ''} ${isCompleted && verificarObjetoEnLinea(fila, columna, linesCompleted) ? 'bingo-line' : ''}" onclick="playerToggleObjective('${obj.id}')" style="cursor:pointer;">
            <div class="item-position">${fila + 1},${columna + 1}</div>
            <img src="${obj.imagen}" alt="${obj.nombre}" class="item-img" onerror="this.src='https://via.placeholder.com/56/2a2a3a/ffffff?text=${encodeURIComponent(obj.nombre.charAt(0))}'">
            <div class="item-name">${obj.nombre}</div><div class="item-points">+${obj.puntos || 0} pts</div>
            <div class="item-status ${isCompleted ? 'done' : 'pending'}">${isCompleted ? '✓ Completado' : '□ Marcar'}</div></div>`;
    }).join('');
    
    const info = document.getElementById('bingoLinesInfo'); if (info) info.remove();
    if (linesCompleted.length > 0) {
        const div = document.createElement('div'); div.id = 'bingoLinesInfo';
        div.style.cssText = 'text-align:center;margin-top:10px;color:#ffd700;font-weight:700;padding:8px;';
        div.textContent = `🏆 Líneas: ${linesCompleted.map(l => l.nombre).join(', ')} (+${linesCompleted.reduce((s, l) => s + l.puntos, 0)} pts)`;
        grid.parentNode.appendChild(div);
    }
}

function calcularLineasCompletadas(completedIds) {
    const lines = [];
    for (let f = 0; f < FILAS; f++) {
        const ids = []; for (let c = 0; c < COLUMNAS; c++) { const i = f * COLUMNAS + c; if (i < allObjectives.length) ids.push(allObjectives[i].id); }
        if (ids.length > 0 && ids.every(id => completedIds.includes(id))) lines.push({ tipo: 'horizontal', indice: f, nombre: `Fila ${f + 1}`, puntos: 100 });
    }
    for (let c = 0; c < COLUMNAS; c++) {
        const ids = []; for (let f = 0; f < FILAS; f++) { const i = f * COLUMNAS + c; if (i < allObjectives.length) ids.push(allObjectives[i].id); }
        if (ids.length > 0 && ids.every(id => completedIds.includes(id))) lines.push({ tipo: 'vertical', indice: c, nombre: `Columna ${c + 1}`, puntos: 150 });
    }
    if (allObjectives.length >= 12 && [0, 2, 15, 17].every(idx => completedIds.includes(allObjectives[idx]?.id))) lines.push({ tipo: 'esquinas', indice: 0, nombre: '4 Esquinas', puntos: 100 });
    if (allObjectives.length > 0 && allObjectives.every(obj => completedIds.includes(obj.id))) lines.push({ tipo: 'llena', indice: 0, nombre: '¡BINGO TOTAL!', puntos: 300 });
    return lines;
}

function verificarObjetoEnLinea(fila, columna, lines) {
    return lines.some(l => (l.tipo === 'horizontal' && l.indice === fila) || (l.tipo === 'vertical' && l.indice === columna) || (l.tipo === 'esquinas' && ((fila === 0 || fila === 5) && (columna === 0 || columna === 2))) || l.tipo === 'llena');
}

function checkForCompletion() {
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (!teamData) return;
    const completedIds = teamData.objetivos_completados || [];
    const currentBingos = calcularLineasCompletadas(completedIds);
    const newBingos = currentBingos.filter(c => !(lastBingos[currentTeam] || []).some(p => p.tipo === c.tipo && p.indice === c.indice));
    newBingos.forEach(b => showToast(`🎯 ¡${b.nombre}! +${b.puntos} pts`));
    const total = completedIds.filter(id => allObjectives.some(o => o.id === id)).length;
    if (allObjectives.length > 0 && total === allObjectives.length && (lastCompletedCount[currentTeam] || 0) < allObjectives.length) { triggerConfetti(); showToast('🎉 ¡BINGO TOTAL!'); }
    lastBingos[currentTeam] = currentBingos; lastCompletedCount[currentTeam] = total;
}

function updateTeamInfo() {
    const td = allTeams.find(t => t.id === currentTeam);
    if (td) {
        document.getElementById('teamPointsDisplay').textContent = td.puntos || 0;
        const sorted = [...allTeams].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
        const pos = sorted.findIndex(t => t.id === currentTeam) + 1;
        document.getElementById('teamRankDisplay').textContent = `Posición: ${{1:'🥇',2:'🥈',3:'🥉'}[pos] || '#'+pos} | ${(td.objetivos_completados||[]).length}/${allObjectives.length}`;
    }
}

function renderRanking() {
    const tbody = document.getElementById('rankingBody');
    if (!tbody) return;
    const sorted = [...allTeams].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
    if (sorted.length > 0 && previousFirstPlace !== sorted[0].id) { triggerFirstPlaceAnimation(sorted[0]); previousFirstPlace = sorted[0].id; }
    tbody.innerHTML = sorted.length === 0 ? '<tr><td colspan="3">No hay equipos</td></tr>' : sorted.map((t, i) => `<tr class="${{1:'position-1',2:'position-2',3:'position-3'}[i+1]||''}"><td><span class="rank-badge ${{1:'rank-1',2:'rank-2',3:'rank-3'}[i+1]||'rank-other'}">${i+1}</span></td><td><span class="team-dot" style="background:${t.color||'#888'};color:${t.color||'#888'};"></span>${t.nombre||t.id}</td><td><strong>${t.puntos||0}</strong> pts</td></tr>`).join('');
}

function triggerFirstPlaceAnimation(team) { showToast(`🏆 ¡${team.nombre || team.id} primer lugar!`); }

function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    const colors = ['#ff4444','#4488ff','#44ff44','#ffd700','#ff6b35','#ff00ff','#00ffff','#ffffff'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div'); piece.className = 'confetti-piece';
        piece.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*1.5}s;animation-duration:${2+Math.random()*3}s;`;
        container.appendChild(piece); setTimeout(() => piece.remove(), 4000);
    }
}

function updateTimer(data) {
    const el = document.getElementById('timerValue');
    if (!el) return;
    if (!data || data.estado === 'esperando') { el.textContent = '--:--'; return; }
    if (data.estado === 'finalizada') { el.textContent = 'FINALIZADO'; return; }
    if (data.pausado) { el.textContent = formatTime(data.tiempo_restante || 0) + ' ⏸'; return; }
    if (window.timerInterval) clearInterval(window.timerInterval);
    const update = () => {
        const restante = Math.max(0, (data.tiempo_total || 0) - Math.floor((Date.now() - (data.tiempo_inicio?.toMillis() || Date.now())) / 1000));
        el.textContent = formatTime(restante);
        el.className = 'timer-value' + (restante <= 60 ? ' urgent' : restante <= 300 ? ' warning' : '');
    };
    update(); window.timerInterval = setInterval(update, 1000);
}

function formatTime(s) { const m = Math.floor(s / 60); return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }

function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    if (container.querySelectorAll('.toast-msg').length >= 3) container.querySelector('.toast-msg').remove();
    const toast = document.createElement('div'); toast.className = 'toast-msg';
    toast.innerHTML = `<span>📢</span> ${msg} <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) { toast.style.animation = 'toastOut 0.4s ease forwards'; setTimeout(() => toast.remove(), 400); } }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    cargarEquiposInicio();
    const saved = localStorage.getItem('bingo_currentTeam');
    if (saved) { currentTeam = saved; currentTeamColor = localStorage.getItem('bingo_currentTeamColor') || '#ff4444'; currentTeamEmoji = localStorage.getItem('bingo_currentTeamEmoji') || '🔴'; showTeamView(); }
});

window.addEventListener('beforeunload', () => {
    if (currentTeam) { localStorage.setItem('bingo_currentTeam', currentTeam); localStorage.setItem('bingo_currentTeamColor', currentTeamColor); localStorage.setItem('bingo_currentTeamEmoji', currentTeamEmoji); }
});