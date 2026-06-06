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

console.log('🎯 Bingo FF Live - app.js cargado');

function cargarEquiposInicio() {
    console.log('📋 Cargando equipos en pantalla principal...');
    const grid = document.getElementById('teamsGrid');
    if (!grid) { console.error('❌ No se encontró teamsGrid'); return; }
    if (equiposInicioUnsub) equiposInicioUnsub();
    
    equiposInicioUnsub = db.collection('equipos').onSnapshot(snapshot => {
        const teams = [];
        snapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
        console.log(`👥 ${teams.length} equipos encontrados`);
        
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
        console.log('✅ Equipos renderizados');
    }, error => {
        console.error('❌ Error al cargar equipos:', error);
    });
}

function selectTeam(teamId, emoji, color) {
    console.log(`🖱️ Seleccionando equipo: ${teamId}`);
    currentTeam = teamId; currentTeamColor = color; currentTeamEmoji = emoji;
    document.getElementById('modalTeamTitle').textContent = `${emoji} Unirse a ${teamId.charAt(0).toUpperCase() + teamId.slice(1)}`;
    document.getElementById('playerName').value = localStorage.getItem(`bingo_playerName_${teamId}`) || '';
    document.getElementById('playerUID').value = localStorage.getItem(`bingo_playerUID_${teamId}`) || '';
    document.getElementById('nameModal').classList.add('show');
    setTimeout(() => document.getElementById('playerName').focus(), 100);
}

function closeModal() { 
    console.log('❌ Modal cerrado');
    document.getElementById('nameModal').classList.remove('show'); 
}

function joinTeam() {
    const name = document.getElementById('playerName').value.trim();
    const uid = document.getElementById('playerUID').value.trim();
    if (!name) { alert('Por favor ingresa tu nombre'); document.getElementById('playerName').focus(); return; }
    
    console.log(`👤 Unirse a ${currentTeam}: ${name}`);
    localStorage.setItem(`bingo_playerName_${currentTeam}`, name);
    localStorage.setItem(`bingo_playerUID_${currentTeam}`, uid);
    
    const teamRef = db.collection('equipos').doc(currentTeam);
    teamRef.get().then(doc => {
        if (doc.exists) {
            console.log('📝 Actualizando equipo existente');
            return teamRef.update({ jugador_nombre: name, jugador_uid: uid });
        } else {
            console.log('🆕 Creando nuevo equipo');
            return teamRef.set({ 
                nombre: currentTeam.charAt(0).toUpperCase() + currentTeam.slice(1), 
                color: currentTeamColor, puntos: 0, 
                objetivos_completados: [], bingos_ganados: [], 
                jugador_nombre: name, jugador_uid: uid 
            });
        }
    }).then(() => {
        console.log('✅ Equipo guardado en Firestore');
    }).catch(err => {
        console.error('❌ Error al guardar equipo:', err);
    });
    
    document.getElementById('nameModal').classList.remove('show');
    showTeamView();
}

function showTeamView() {
    console.log('🎮 Mostrando vista de equipo');
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('teamView').style.display = 'block';
    document.getElementById('teamView').classList.add('active');
    document.getElementById('teamColorDot').style.background = currentTeamColor;
    document.getElementById('teamColorDot').style.color = currentTeamColor;
    document.getElementById('teamNameDisplay').textContent = `${currentTeamEmoji} ${currentTeam.charAt(0).toUpperCase() + currentTeam.slice(1)}`;
    setupTeamListeners();
}

function goHome() {
    console.log('🏠 Volviendo al inicio');
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
    console.log('👂 Configurando listeners en tiempo real');
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    const tiempoEntrada = Date.now();
    
    unsubscribes.push(db.collection('objetivos').orderBy('orden', 'asc').onSnapshot(snapshot => {
        allObjectives = []; 
        snapshot.forEach(doc => allObjectives.push({ id: doc.id, ...doc.data() }));
        console.log(`📦 ${allObjectives.length} objetivos cargados`);
        renderBingoGrid();
    }, error => console.error('❌ Error objetivos:', error)));
    
    unsubscribes.push(db.collection('equipos').onSnapshot(snapshot => {
        allTeams = []; 
        snapshot.forEach(doc => allTeams.push({ id: doc.id, ...doc.data() }));
        console.log(`👥 ${allTeams.length} equipos actualizados`);
        updateTeamInfo(); renderRanking(); checkForCompletion(); renderBingoGrid();
    }, error => console.error('❌ Error equipos:', error)));
    
    unsubscribes.push(db.collection('partida').doc('actual').onSnapshot(doc => {
        if (doc.exists) updateTimer(doc.data());
    }));
    
    unsubscribes.push(db.collection('notificaciones').orderBy('timestamp', 'desc').limit(5).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if ((data.timestamp?.toMillis() || 0) > tiempoEntrada) showToast(data.mensaje);
            }
        });
    }));
}

// ===== JUGADOR MARCA/DESMARCA OBJETO =====
async function playerToggleObjective(objectiveId) {
    console.log('🖱️ Click en objeto:', objectiveId);
    console.log('👤 Equipo actual:', currentTeam);
    
    if (!currentTeam) {
        console.error('❌ No hay equipo seleccionado');
        showToast('❌ Error: No hay equipo seleccionado');
        return;
    }
    
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (!teamData) {
        console.error('❌ No se encontró el equipo:', currentTeam);
        showToast('❌ Error: Equipo no encontrado');
        return;
    }
    
    const objective = allObjectives.find(o => o.id === objectiveId);
    if (!objective) {
        console.error('❌ No se encontró el objeto:', objectiveId);
        showToast('❌ Error: Objeto no encontrado');
        return;
    }
    
    console.log('📦 Equipo:', teamData.nombre, '| Puntos:', teamData.puntos);
    console.log('🎯 Objeto:', objective.nombre, '| Puntos:', objective.puntos);
    
    let completedIds = [...(teamData.objetivos_completados || [])];
    let puntos = teamData.puntos || 0;
    let bingosGanados = [...(teamData.bingos_ganados || [])];
    
    // Si ya está completado, DESMARCAR
    if (completedIds.includes(objectiveId)) {
        const confirmar = confirm(`¿Quieres DESMARCAR "${objective.nombre}"?\n\nSe restarán ${objective.puntos} puntos.`);
        if (!confirmar) return;
        
        completedIds = completedIds.filter(id => id !== objectiveId);
        
        const basePoints = completedIds.reduce((sum, id) => {
            const obj = allObjectives.find(o => o.id === id);
            return sum + (obj?.puntos || 0);
        }, 0);
        
        const remainingLines = calcularLineasCompletadas(completedIds);
        const bingoPoints = remainingLines.reduce((sum, l) => sum + l.puntos, 0);
        puntos = basePoints + bingoPoints;
        bingosGanados = [];
        
        console.log('🔄 Desmarcando... Nuevos puntos:', puntos);
        
        try {
            await db.collection('equipos').doc(currentTeam).update({
                objetivos_completados: completedIds,
                puntos: puntos,
                bingos_ganados: bingosGanados
            });
            console.log('✅ Desmarcado en Firestore');
            showToast(`❌ "${objective.nombre}" desmarcado`);
        } catch (error) {
            console.error('❌ Error Firestore:', error);
            showToast('❌ Error: ' + error.message);
        }
        return;
    }
    
    // MARCAR COMO COMPLETADO
    const confirmar = confirm(`¿Confirmas que encontraste "${objective.nombre}"?\n\n+${objective.puntos} pts`);
    if (!confirmar) return;
    
    completedIds.push(objectiveId);
    puntos += (objective.puntos || 0);
    
    const previousLines = calcularLineasCompletadas(teamData.objetivos_completados || []);
    const newLines = calcularLineasCompletadas(completedIds);
    const newBingos = newLines.filter(nl => 
        !previousLines.some(pl => pl.tipo === nl.tipo && pl.indice === nl.indice)
    );
    
    newBingos.forEach(b => {
        puntos += b.puntos;
        bingosGanados.push(`${b.tipo}_${b.indice}_${Date.now()}`);
    });
    
    console.log('✅ Marcando... Nuevos puntos:', puntos);
    if (newBingos.length > 0) console.log('🏆 Bingos:', newBingos.map(b => b.nombre));
    
    try {
        await db.collection('equipos').doc(currentTeam).update({
            objetivos_completados: completedIds,
            puntos: puntos,
            bingos_ganados: bingosGanados
        });
        console.log('✅ Guardado en Firestore');
        showToast(`✅ "${objective.nombre}" +${objective.puntos} pts`);
        
        if (newBingos.length > 0) {
            newBingos.forEach(bingo => {
                showToast(`🎯 ¡${bingo.nombre}! +${bingo.puntos} pts`);
            });
        }
    } catch (error) {
        console.error('❌ Error Firestore:', error);
        console.error('Código:', error.code);
        console.error('Mensaje:', error.message);
        showToast('❌ Error: ' + error.message);
    }
}

function renderBingoGrid() {
    const grid = document.getElementById('bingoGrid');
    if (!grid) return;
    grid.className = 'bingo-grid-3x6';
    
    if (allObjectives.length === 0) {
        grid.innerHTML = '<p style="color:#a0a0b0;text-align:center;grid-column:1/-1;padding:20px;">Cargando objetivos...</p>';
        return;
    }
    
    const currentTeamData = allTeams.find(t => t.id === currentTeam);
    const completedIds = currentTeamData?.objetivos_completados || [];
    const linesCompleted = calcularLineasCompletadas(completedIds);
    
    grid.innerHTML = allObjectives.map((obj, index) => {
        const isCompleted = completedIds.includes(obj.id);
        const fila = Math.floor(index / COLUMNAS);
        const columna = index % COLUMNAS;
        const enLinea = verificarObjetoEnLinea(fila, columna, linesCompleted);
        
        return `<div class="bingo-item ${isCompleted ? 'completed' : ''} ${enLinea && isCompleted ? 'bingo-line' : ''}" onclick="playerToggleObjective('${obj.id}')" style="cursor:pointer;">
            <div class="item-position">${fila + 1},${columna + 1}</div>
            <img src="${obj.imagen}" alt="${obj.nombre}" class="item-img" onerror="this.src='https://via.placeholder.com/56/2a2a3a/ffffff?text=${encodeURIComponent(obj.nombre.charAt(0))}'">
            <div class="item-name">${obj.nombre}</div>
            <div class="item-points">+${obj.puntos || 0} pts</div>
            <div class="item-status ${isCompleted ? 'done' : 'pending'}">${isCompleted ? '✓ Completado' : '□ Click para marcar'}</div>
        </div>`;
    }).join('');
    
    const existingInfo = document.getElementById('bingoLinesInfo');
    if (existingInfo) existingInfo.remove();
    
    if (linesCompleted.length > 0) {
        const gridParent = grid.parentNode;
        const infoDiv = document.createElement('div');
        infoDiv.id = 'bingoLinesInfo';
        infoDiv.style.cssText = 'text-align:center;margin-top:10px;color:#ffd700;font-weight:700;font-size:0.9rem;padding:8px;';
        infoDiv.textContent = `🏆 Líneas: ${linesCompleted.map(l => l.nombre).join(', ')} (+${linesCompleted.reduce((sum, l) => sum + l.puntos, 0)} pts)`;
        gridParent.appendChild(infoDiv);
    }
}

function calcularLineasCompletadas(completedIds) {
    const lines = [];
    for (let fila = 0; fila < FILAS; fila++) {
        const objetosEnFila = [];
        for (let col = 0; col < COLUMNAS; col++) {
            const index = fila * COLUMNAS + col;
            if (index < allObjectives.length) objetosEnFila.push(allObjectives[index].id);
        }
        if (objetosEnFila.length > 0 && objetosEnFila.every(id => completedIds.includes(id))) {
            lines.push({ tipo: 'horizontal', indice: fila, nombre: `Fila ${fila + 1}`, puntos: 100 });
        }
    }
    for (let col = 0; col < COLUMNAS; col++) {
        const objetosEnCol = [];
        for (let fila = 0; fila < FILAS; fila++) {
            const index = fila * COLUMNAS + col;
            if (index < allObjectives.length) objetosEnCol.push(allObjectives[index].id);
        }
        if (objetosEnCol.length > 0 && objetosEnCol.every(id => completedIds.includes(id))) {
            lines.push({ tipo: 'vertical', indice: col, nombre: `Columna ${col + 1}`, puntos: 150 });
        }
    }
    if (allObjectives.length >= 12) {
        const esquinas = [0, 2, 15, 17];
        if (esquinas.every(idx => completedIds.includes(allObjectives[idx]?.id))) {
            lines.push({ tipo: 'esquinas', indice: 0, nombre: '4 Esquinas', puntos: 100 });
        }
    }
    if (allObjectives.length > 0 && allObjectives.every(obj => completedIds.includes(obj.id))) {
        lines.push({ tipo: 'llena', indice: 0, nombre: '¡BINGO TOTAL!', puntos: 300 });
    }
    return lines;
}

function verificarObjetoEnLinea(fila, columna, linesCompleted) {
    return linesCompleted.some(line => {
        if (line.tipo === 'horizontal' && line.indice === fila) return true;
        if (line.tipo === 'vertical' && line.indice === columna) return true;
        if (line.tipo === 'esquinas' && ((fila === 0 || fila === 5) && (columna === 0 || columna === 2))) return true;
        if (line.tipo === 'llena') return true;
        return false;
    });
}

function checkForCompletion() {
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (!teamData) return;
    const completedIds = teamData.objetivos_completados || [];
    const currentBingos = calcularLineasCompletadas(completedIds);
    const previousBingos = lastBingos[currentTeam] || [];
    const newBingos = currentBingos.filter(current => !previousBingos.some(prev => prev.tipo === current.tipo && prev.indice === current.indice));
    newBingos.forEach(bingo => showToast(`🎯 ¡${bingo.nombre} completada! +${bingo.puntos} pts`));
    
    const totalCompletados = completedIds.filter(id => allObjectives.some(obj => obj.id === id)).length;
    if (allObjectives.length > 0 && totalCompletados === allObjectives.length && (lastCompletedCount[currentTeam] || 0) < allObjectives.length) {
        triggerConfetti();
        showToast('🎉 ¡BINGO TOTAL! ¡Todos los objetivos completados!');
    }
    lastBingos[currentTeam] = currentBingos;
    lastCompletedCount[currentTeam] = totalCompletados;
}

function updateTeamInfo() {
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (teamData) {
        document.getElementById('teamPointsDisplay').textContent = teamData.puntos || 0;
        const sorted = [...allTeams].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
        const position = sorted.findIndex(t => t.id === currentTeam) + 1;
        const rankEmojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
        document.getElementById('teamRankDisplay').textContent = `Posición: ${rankEmojis[position] || '#' + position} | ${(teamData.objetivos_completados || []).length}/${allObjectives.length} objetos`;
    }
}

function renderRanking() {
    const tbody = document.getElementById('rankingBody');
    if (!tbody) return;
    const sorted = [...allTeams].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
    if (sorted.length > 0 && previousFirstPlace !== null && previousFirstPlace !== sorted[0].id) {
        triggerFirstPlaceAnimation(sorted[0]);
    }
    if (sorted.length > 0) previousFirstPlace = sorted[0].id;
    
    const rankClasses = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' };
    const positionClasses = { 1: 'position-1', 2: 'position-2', 3: 'position-3' };
    
    tbody.innerHTML = sorted.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#a0a0b0;">No hay equipos aún</td></tr>' : sorted.map((team, index) => {
        const pos = index + 1;
        const completados = (team.objetivos_completados || []).length;
        return `<tr class="${positionClasses[pos] || ''}">
            <td><span class="rank-badge ${rankClasses[pos] || 'rank-other'}">${pos}</span></td>
            <td><span class="team-dot" style="background:${team.color || '#888'};color:${team.color || '#888'};"></span>${team.nombre || team.id} <span style="font-size:0.7rem;color:#a0a0b0;">(${completados}/${allObjectives.length})</span></td>
            <td><strong>${team.puntos || 0}</strong> pts</td>
        </tr>`;
    }).join('');
}

function triggerFirstPlaceAnimation(team) { showToast(`🏆 ¡${team.nombre || team.id} tomó el primer lugar!`); }

function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    const colors = ['#ff4444', '#4488ff', '#44ff44', '#ffd700', '#ff6b35', '#ff00ff', '#00ffff', '#ffffff'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 1.5}s;animation-duration:${2 + Math.random() * 3}s;`;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
}

function updateTimer(partidaData) {
    const timerEl = document.getElementById('timerValue');
    if (!timerEl) return;
    if (window.timerInterval) { clearInterval(window.timerInterval); window.timerInterval = null; }
    
    if (!partidaData || partidaData.estado === 'esperando') { timerEl.textContent = '--:--'; timerEl.className = 'timer-value'; return; }
    if (partidaData.estado === 'finalizada') { timerEl.textContent = 'FINALIZADO'; timerEl.className = 'timer-value'; return; }
    if (partidaData.pausado) { timerEl.textContent = formatTime(partidaData.tiempo_restante || partidaData.tiempo_total || 0) + ' ⏸'; timerEl.className = 'timer-value warning'; return; }
    
    const updateDisplay = () => {
        const ahora = Date.now();
        const tiempoInicio = partidaData.tiempo_inicio?.toMillis() || ahora;
        const tiempoTotal = partidaData.tiempo_total || 0;
        const transcurrido = Math.floor((ahora - tiempoInicio) / 1000);
        const restante = Math.max(0, tiempoTotal - transcurrido);
        timerEl.textContent = formatTime(restante);
        if (restante <= 0) { timerEl.className = 'timer-value urgent'; clearInterval(window.timerInterval); window.timerInterval = null; }
        else if (restante <= 60) timerEl.className = 'timer-value urgent';
        else if (restante <= 300) timerEl.className = 'timer-value warning';
        else timerEl.className = 'timer-value';
    };
    updateDisplay();
    window.timerInterval = setInterval(updateDisplay, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const existingToasts = container.querySelectorAll('.toast-msg');
    if (existingToasts.length >= 3) existingToasts[0].remove();
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<span class="toast-icon">📢</span> ${message} <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) { toast.style.animation = 'toastOut 0.4s ease forwards'; setTimeout(() => toast.remove(), 400); } }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Bingo FF Live - Inicializando...');
    cargarEquiposInicio();
    const savedTeam = localStorage.getItem('bingo_currentTeam');
    if (savedTeam) {
        console.log('💾 Sesión guardada encontrada:', savedTeam);
        currentTeam = savedTeam;
        currentTeamColor = localStorage.getItem('bingo_currentTeamColor') || '#ff4444';
        currentTeamEmoji = localStorage.getItem('bingo_currentTeamEmoji') || '🔴';
        showTeamView();
    }
});

window.addEventListener('beforeunload', () => {
    if (currentTeam) {
        localStorage.setItem('bingo_currentTeam', currentTeam);
        localStorage.setItem('bingo_currentTeamColor', currentTeamColor);
        localStorage.setItem('bingo_currentTeamEmoji', currentTeamEmoji);
    }
});
