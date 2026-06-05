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

// ===== CARGAR EQUIPOS DINÁMICOS EN PANTALLA PRINCIPAL =====
function cargarEquiposInicio() {
    const grid = document.getElementById('teamsGrid');
    if (!grid) return;
    
    // Si hay listener anterior, limpiarlo
    if (equiposInicioUnsub) equiposInicioUnsub();
    
    equiposInicioUnsub = db.collection('equipos').onSnapshot(snapshot => {
        const teams = [];
        snapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });
        
        // Si no hay equipos, mostrar mensaje
        if (teams.length === 0) {
            grid.innerHTML = `
                <p style="color:#a0a0b0;text-align:center;grid-column:1/-1;padding:20px;">
                    No hay equipos aún.<br>El administrador debe crearlos desde el panel.
                </p>
                <a href="admin.html" class="team-btn admin-btn">
                    <span class="team-icon">🔐</span>Administrador
                </a>
            `;
            return;
        }
        
        // Mapeo de colores a emojis
        const getEmoji = (color) => {
            const c = color?.toLowerCase() || '';
            if (c.includes('ff4444') || c.includes('ff0000') || c === 'red') return '🔴';
            if (c.includes('4488ff') || c.includes('0000ff') || c === 'blue') return '🔵';
            if (c.includes('44ff44') || c.includes('00ff00') || c === 'green') return '🟢';
            if (c.includes('ffd700') || c.includes('ffff00') || c === 'yellow') return '🟡';
            if (c.includes('ff8800') || c === 'orange') return '🟠';
            if (c.includes('ff00ff') || c.includes('800080') || c === 'purple') return '🟣';
            if (c.includes('ffffff') || c === 'white') return '⚪';
            if (c.includes('000000') || c === 'black') return '⚫';
            if (c.includes('00ffff') || c === 'cyan') return '🩵';
            if (c.includes('ff69b4') || c === 'pink') return '🩷';
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
        
        // Renderizar botones de equipos
        grid.innerHTML = teams.map(team => {
            const emoji = getEmoji(team.color);
            const colorClass = getColorClass(team.color);
            
            return `
                <button class="team-btn ${colorClass}" 
                        onclick="selectTeam('${team.id}', '${emoji}', '${team.color || '#888'}')"
                        style="border-color: ${team.color || '#888'}40;">
                    <span class="team-icon">${emoji}</span>
                    ${team.nombre || team.id}
                </button>
            `;
        }).join('');
        
        // Botón de admin siempre al final
        grid.innerHTML += `
            <a href="admin.html" class="team-btn admin-btn">
                <span class="team-icon">🔐</span>Administrador
            </a>
        `;
    });
}

// ===== NAVEGACIÓN =====
function selectTeam(teamId, emoji, color) {
    currentTeam = teamId;
    currentTeamColor = color;
    currentTeamEmoji = emoji;
    
    document.getElementById('modalTeamTitle').textContent = `${emoji} Unirse a ${teamId.charAt(0).toUpperCase() + teamId.slice(1)}`;
    document.getElementById('playerName').value = localStorage.getItem(`bingo_playerName_${teamId}`) || '';
    document.getElementById('playerUID').value = localStorage.getItem(`bingo_playerUID_${teamId}`) || '';
    
    document.getElementById('nameModal').classList.add('show');
    
    setTimeout(() => {
        document.getElementById('playerName').focus();
    }, 100);
}

function closeModal() {
    document.getElementById('nameModal').classList.remove('show');
}

function joinTeam() {
    const name = document.getElementById('playerName').value.trim();
    const uid = document.getElementById('playerUID').value.trim();
    
    if (!name) {
        alert('Por favor ingresa tu nombre');
        document.getElementById('playerName').focus();
        return;
    }
    
    localStorage.setItem(`bingo_playerName_${currentTeam}`, name);
    localStorage.setItem(`bingo_playerUID_${currentTeam}`, uid);
    
    const teamRef = db.collection('equipos').doc(currentTeam);
    teamRef.get().then(doc => {
        if (doc.exists) {
            return teamRef.update({
                jugador_nombre: name,
                jugador_uid: uid
            });
        } else {
            return teamRef.set({
                nombre: currentTeam.charAt(0).toUpperCase() + currentTeam.slice(1),
                color: currentTeamColor,
                puntos: 0,
                objetivos_completados: [],
                bingos_ganados: [],
                jugador_nombre: name,
                jugador_uid: uid
            });
        }
    }).catch(err => {
        console.error('❌ Error al guardar en Firestore:', err);
    });
    
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
    
    if (window.timerInterval) { 
        clearInterval(window.timerInterval); 
        window.timerInterval = null; 
    }
    
    document.getElementById('teamView').style.display = 'none';
    document.getElementById('teamView').classList.remove('active');
    document.getElementById('homeScreen').style.display = 'block';
    
    currentTeam = null;
    allObjectives = [];
    allTeams = [];
    
    // Recargar equipos en pantalla principal
    cargarEquiposInicio();
}

// ===== LISTENERS EN TIEMPO REAL =====
function setupTeamListeners() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    
    const tiempoEntrada = Date.now();
    
    const unsubObj = db.collection('objetivos').orderBy('orden', 'asc').onSnapshot(snapshot => {
        allObjectives = [];
        snapshot.forEach(doc => {
            allObjectives.push({ id: doc.id, ...doc.data() });
        });
        renderBingoGrid();
    }, error => {
        console.error('❌ Error al cargar objetivos:', error);
    });
    unsubscribes.push(unsubObj);
    
    const unsubTeams = db.collection('equipos').onSnapshot(snapshot => {
        allTeams = [];
        snapshot.forEach(doc => {
            allTeams.push({ id: doc.id, ...doc.data() });
        });
        updateTeamInfo();
        renderRanking();
        checkForCompletion();
        renderBingoGrid();
    }, error => {
        console.error('❌ Error al cargar equipos:', error);
    });
    unsubscribes.push(unsubTeams);
    
    const unsubPartida = db.collection('partida').doc('actual').onSnapshot(doc => {
        if (doc.exists) {
            updateTimer(doc.data());
        }
    });
    unsubscribes.push(unsubPartida);
    
    const unsubNotif = db.collection('notificaciones')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const notifTime = data.timestamp?.toMillis() || 0;
                    if (notifTime > tiempoEntrada) {
                        showToast(data.mensaje);
                    }
                }
            });
        });
    unsubscribes.push(unsubNotif);
}

// ===== JUGADOR MARCA/DESMARCA OBJETO =====
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
        
        try {
            await db.collection('equipos').doc(currentTeam).update({
                objetivos_completados: completedIds,
                puntos: puntos,
                bingos_ganados: bingosGanados
            });
            
            await db.collection('notificaciones').add({
                mensaje: `❌ ${teamData.nombre || currentTeam} DESMARCÓ: ${objective.nombre}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast(`❌ "${objective.nombre}" desmarcado`);
        } catch (error) {
            console.error('Error:', error);
            showToast('❌ Error al desmarcar');
        }
        return;
    }
    
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
    
    try {
        await db.collection('equipos').doc(currentTeam).update({
            objetivos_completados: completedIds,
            puntos: puntos,
            bingos_ganados: bingosGanados
        });
        
        let msg = `✅ ${teamData.nombre || currentTeam} completó: ${objective.nombre} (+${objective.puntos} pts)`;
        await db.collection('notificaciones').add({
            mensaje: msg,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        newBingos.forEach(bingo => {
            db.collection('notificaciones').add({
                mensaje: `🎯 ¡${teamData.nombre || currentTeam} completó ${bingo.nombre}! (+${bingo.puntos} pts)`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        showToast(`✅ "${objective.nombre}" +${objective.puntos} pts`);
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error al marcar objeto');
    }
}

// ===== RENDERIZAR CARTILLA BINGO 3x6 =====
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
        
        return `
            <div class="bingo-item ${isCompleted ? 'completed' : ''} ${enLinea && isCompleted ? 'bingo-line' : ''}" 
                 onclick="playerToggleObjective('${obj.id}')"
                 style="cursor:pointer;">
                <div class="item-position">${fila + 1},${columna + 1}</div>
                <img src="${obj.imagen}" 
                     alt="${obj.nombre}" 
                     class="item-img"
                     onerror="this.src='https://via.placeholder.com/56/2a2a3a/ffffff?text=${encodeURIComponent(obj.nombre.charAt(0))}'">
                <div class="item-name">${obj.nombre}</div>
                <div class="item-points">+${obj.puntos || 0} pts</div>
                <div class="item-status ${isCompleted ? 'done' : 'pending'}">
                    ${isCompleted ? '✓ Completado' : '□ Click para marcar'}
                </div>
            </div>
        `;
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

// ===== SISTEMA DE BINGO =====
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

// ===== VERIFICAR NUEVOS BINGOS =====
function checkForCompletion() {
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (!teamData) return;
    
    const completedIds = teamData.objetivos_completados || [];
    const currentBingos = calcularLineasCompletadas(completedIds);
    const previousBingos = lastBingos[currentTeam] || [];
    
    const newBingos = currentBingos.filter(current => 
        !previousBingos.some(prev => prev.tipo === current.tipo && prev.indice === current.indice)
    );
    
    newBingos.forEach(bingo => {
        showToast(`🎯 ¡${bingo.nombre} completada! +${bingo.puntos} pts`);
    });
    
    const totalCompletados = completedIds.filter(id => allObjectives.some(obj => obj.id === id)).length;
    
    if (allObjectives.length > 0 && totalCompletados === allObjectives.length && 
        (lastCompletedCount[currentTeam] || 0) < allObjectives.length) {
        triggerConfetti();
        showToast('🎉 ¡BINGO TOTAL! ¡Todos los objetivos completados!');
    }
    
    lastBingos[currentTeam] = currentBingos;
    lastCompletedCount[currentTeam] = totalCompletados;
}

// ===== ACTUALIZAR INFO DEL EQUIPO =====
function updateTeamInfo() {
    const teamData = allTeams.find(t => t.id === currentTeam);
    if (teamData) {
        document.getElementById('teamPointsDisplay').textContent = teamData.puntos || 0;
        
        const sorted = [...allTeams].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
        const position = sorted.findIndex(t => t.id === currentTeam) + 1;
        
        const rankEmojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const completados = (teamData.objetivos_completados || []).length;
        const total = allObjectives.length;
        
        document.getElementById('teamRankDisplay').textContent = 
            `Posición: ${rankEmojis[position] || '#' + position} | ${completados}/${total} objetos`;
    }
}

// ===== RENDERIZAR RANKING =====
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
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#a0a0b0;">No hay equipos aún</td></tr>';
        return;
    }
    
    tbody.innerHTML = sorted.map((team, index) => {
        const pos = index + 1;
        const completados = (team.objetivos_completados || []).length;
        return `
            <tr class="${positionClasses[pos] || ''}">
                <td><span class="rank-badge ${rankClasses[pos] || 'rank-other'}">${pos}</span></td>
                <td>
                    <span class="team-dot" style="background:${team.color || '#888'};color:${team.color || '#888'};"></span>
                    ${team.nombre || team.id}
                    <span style="font-size:0.7rem;color:#a0a0b0;">(${completados}/${allObjectives.length})</span>
                </td>
                <td><strong>${team.puntos || 0}</strong> pts</td>
            </tr>
        `;
    }).join('');
}

function triggerFirstPlaceAnimation(team) {
    showToast(`🏆 ¡${team.nombre || team.id} tomó el primer lugar!`);
}

function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;
    
    const colors = ['#ff4444', '#4488ff', '#44ff44', '#ffd700', '#ff6b35', '#ff00ff', '#00ffff', '#ffffff'];
    
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = `
            left: ${Math.random() * 100}%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-delay: ${Math.random() * 1.5}s;
            animation-duration: ${2 + Math.random() * 3}s;
        `;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
}

// ===== TEMPORIZADOR =====
function updateTimer(partidaData) {
    const timerEl = document.getElementById('timerValue');
    if (!timerEl) return;
    
    if (!partidaData || partidaData.estado === 'esperando') {
        timerEl.textContent = '--:--';
        timerEl.className = 'timer-value';
        if (window.timerInterval) { clearInterval(window.timerInterval); window.timerInterval = null; }
        return;
    }
    
    if (partidaData.estado === 'finalizada') {
        timerEl.textContent = 'FINALIZADO';
        timerEl.className = 'timer-value';
        if (window.timerInterval) { clearInterval(window.timerInterval); window.timerInterval = null; }
        return;
    }
    
    if (partidaData.pausado) {
        timerEl.textContent = formatTime(partidaData.tiempo_restante || 0);
        timerEl.className = 'timer-value warning';
        if (window.timerInterval) { clearInterval(window.timerInterval); window.timerInterval = null; }
        return;
    }
    
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    const updateDisplay = () => {
        const ahora = Date.now();
        const tiempoInicio = partidaData.tiempo_inicio?.toMillis() || ahora;
        const tiempoTotal = partidaData.tiempo_total || 0;
        const transcurrido = Math.floor((ahora - tiempoInicio) / 1000);
        const restante = Math.max(0, tiempoTotal - transcurrido);
        
        timerEl.textContent = formatTime(restante);
        timerEl.className = restante <= 60 ? 'timer-value urgent' : 
                           restante <= 300 ? 'timer-value warning' : 'timer-value';
    };
    
    updateDisplay();
    window.timerInterval = setInterval(updateDisplay, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const existingToasts = container.querySelectorAll('.toast-msg');
    if (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `
        <span class="toast-icon">📢</span> ${message}
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toastOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }
    }, 3000);
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Bingo FF Live - Inicializando...');
    
    // Cargar equipos dinámicos en pantalla principal
    cargarEquiposInicio();
    
    // Verificar sesión guardada
    const savedTeam = localStorage.getItem('bingo_currentTeam');
    if (savedTeam) {
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