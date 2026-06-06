// ============================================
// BINGO FF LIVE - Dashboard Administrador
// ============================================

let adminUnsubscribes = [];
let adminAllTeams = [];
let adminAllObjectives = [];
let currentPartidaData = null;
let adminTimerInterval = null;

const FILAS = 6;
const COLUMNAS = 3;

function loginAdmin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        errorEl.textContent = 'Por favor completa todos los campos.';
        errorEl.style.display = 'block';
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => db.collection('usuarios').doc(userCredential.user.uid).get())
        .then((doc) => {
            if (doc.exists && doc.data().rol === 'admin') {
                showDashboard(auth.currentUser);
            } else {
                auth.signOut();
                errorEl.textContent = 'No tienes permisos de administrador.';
                errorEl.style.display = 'block';
            }
        })
        .catch((error) => {
            errorEl.textContent = 'Error: ' + error.message;
            errorEl.style.display = 'block';
        });
}

function logoutAdmin() {
    adminUnsubscribes.forEach(unsub => unsub());
    adminUnsubscribes = [];
    if (adminTimerInterval) clearInterval(adminTimerInterval);
    auth.signOut();
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
}

function showDashboard(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    document.getElementById('adminUserEmail').textContent = user?.email || 'Admin';
    setupAdminListeners();
}

auth.onAuthStateChanged((user) => {
    if (user) {
        db.collection('usuarios').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().rol === 'admin') showDashboard(user);
            else { auth.signOut(); document.getElementById('loginScreen').style.display = 'flex'; }
        });
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardScreen').style.display = 'none';
    }
});

function setupAdminListeners() {
    adminUnsubscribes.forEach(unsub => unsub());
    adminUnsubscribes = [];
    
    adminUnsubscribes.push(db.collection('equipos').onSnapshot(snapshot => {
        adminAllTeams = [];
        snapshot.forEach(doc => adminAllTeams.push({ id: doc.id, ...doc.data() }));
        renderTeamsList();
        populateTeamSelect();
        loadTeamObjectives();
    }));
    
    adminUnsubscribes.push(db.collection('objetivos').orderBy('orden', 'asc').onSnapshot(snapshot => {
        adminAllObjectives = [];
        snapshot.forEach(doc => adminAllObjectives.push({ id: doc.id, ...doc.data() }));
        renderObjectivesList();
        loadTeamObjectives();
    }));
    
    adminUnsubscribes.push(db.collection('partida').doc('actual').onSnapshot(doc => {
        if (doc.exists) {
            currentPartidaData = doc.data();
            updateAdminTimer();
        }
    }));
}

function populateTeamSelect() {
    const select = document.getElementById('validationTeamSelect');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Seleccionar equipo --</option>';
    adminAllTeams.forEach(team => {
        select.innerHTML += `<option value="${team.id}">${team.nombre || team.id}</option>`;
    });
    if (currentValue && adminAllTeams.some(t => t.id === currentValue)) select.value = currentValue;
}

function loadTeamObjectives() {
    const teamId = document.getElementById('validationTeamSelect').value;
    const container = document.getElementById('validationObjectivesList');
    
    if (!teamId) {
        container.innerHTML = '<p style="color:#a0a0b0;">Selecciona un equipo para ver su cartilla.</p>';
        return;
    }
    
    const team = adminAllTeams.find(t => t.id === teamId);
    if (!team) return;
    
    const completedIds = team.objetivos_completados || [];
    const totalCompletados = completedIds.filter(id => adminAllObjectives.some(obj => obj.id === id)).length;
    const lineasCompletadas = calcularLineasCompletadas(completedIds);
    const puntosBingo = lineasCompletadas.reduce((sum, l) => sum + l.puntos, 0);
    
    let html = `<div style="background:${team.color || '#888'}20; border:1px solid ${team.color || '#888'}; border-radius:10px; padding:12px; margin-bottom:15px; text-align:center;">
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${team.color || '#888'};margin-right:6px;"></span>
        <strong>${team.nombre || team.id}</strong> | 
        <span style="color:#ffd700;">${team.puntos || 0} pts</span> | 
        Progreso: ${totalCompletados}/${adminAllObjectives.length}
        ${puntosBingo > 0 ? ` | <span style="color:#00ff88;">Bingos: +${puntosBingo} pts</span>` : ''}
    </div>
    <div class="bingo-grid-3x6" style="margin-bottom:15px;">`;
    
    adminAllObjectives.forEach((obj, index) => {
        const isCompleted = completedIds.includes(obj.id);
        const fila = Math.floor(index / COLUMNAS);
        const columna = index % COLUMNAS;
        const enLinea = verificarObjetoEnLinea(fila, columna, lineasCompletadas);
        
        html += `<div class="bingo-item ${isCompleted ? 'completed' : ''} ${enLinea && isCompleted ? 'bingo-line' : ''}" 
            onclick="toggleObjectiveAdmin('${teamId}', '${obj.id}', ${!isCompleted})" style="cursor:pointer;">
            <div class="item-position">${fila + 1},${columna + 1}</div>
            <img src="${obj.imagen}" alt="${obj.nombre}" class="item-img" onerror="this.src='https://via.placeholder.com/40/2a2a3a/ffffff?text=?'">
            <div class="item-name">${obj.nombre}</div>
            <div class="item-points">+${obj.puntos || 0} pts</div>
            <div class="item-status ${isCompleted ? 'done' : 'pending'}">${isCompleted ? '✓ Revocar' : '□ Aprobar'}</div>
        </div>`;
    });
    
    html += '</div>';
    
    if (lineasCompletadas.length > 0) {
        html += `<div style="background:rgba(255,215,0,0.1); border:1px solid #ffd700; border-radius:8px; padding:10px; text-align:center;">
            🏆 <strong>Líneas completadas:</strong> ${lineasCompletadas.map(l => `${l.nombre} (+${l.puntos})`).join(', ')}
        </div>`;
    }
    
    container.innerHTML = html;
}

async function toggleObjectiveAdmin(teamId, objectiveId, approve) {
    const team = adminAllTeams.find(t => t.id === teamId);
    const objective = adminAllObjectives.find(o => o.id === objectiveId);
    if (!team || !objective) return;
    
    let completedIds = [...(team.objetivos_completados || [])];
    let puntos = team.puntos || 0;
    let bingosGanados = [...(team.bingos_ganados || [])];
    
    if (approve && !completedIds.includes(objectiveId)) {
        completedIds.push(objectiveId);
        puntos += (objective.puntos || 0);
        const newLines = calcularLineasCompletadas(completedIds);
        const previousLines = calcularLineasCompletadas(team.objetivos_completados || []);
        const newBingos = newLines.filter(nl => !previousLines.some(pl => pl.tipo === nl.tipo && pl.indice === nl.indice));
        newBingos.forEach(b => { puntos += b.puntos; bingosGanados.push(`${b.tipo}_${b.indice}_${Date.now()}`); });
    } else if (!approve && completedIds.includes(objectiveId)) {
        completedIds = completedIds.filter(id => id !== objectiveId);
        const remainingLines = calcularLineasCompletadas(completedIds);
        const basePoints = completedIds.reduce((sum, id) => { const obj = adminAllObjectives.find(o => o.id === id); return sum + (obj?.puntos || 0); }, 0);
        puntos = basePoints + remainingLines.reduce((sum, l) => sum + l.puntos, 0);
        bingosGanados = [];
    }
    
    try {
        await db.collection('equipos').doc(teamId).update({ objetivos_completados: completedIds, puntos, bingos_ganados: bingosGanados });
        const msg = `${approve ? '✅ Aprobado' : '✗ Revocado'}: ${objective.nombre} → ${team.nombre || teamId}`;
        db.collection('notificaciones').add({ mensaje: msg, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        adminToast(msg);
        loadTeamObjectives();
    } catch (error) {
        adminToast('❌ Error: ' + error.message);
    }
}

function calcularLineasCompletadas(completedIds) {
    const lines = [];
    for (let fila = 0; fila < FILAS; fila++) {
        const objetosEnFila = [];
        for (let col = 0; col < COLUMNAS; col++) {
            const index = fila * COLUMNAS + col;
            if (index < adminAllObjectives.length) objetosEnFila.push(adminAllObjectives[index].id);
        }
        if (objetosEnFila.length > 0 && objetosEnFila.every(id => completedIds.includes(id))) {
            lines.push({ tipo: 'horizontal', indice: fila, nombre: `Fila ${fila + 1}`, puntos: 100 });
        }
    }
    for (let col = 0; col < COLUMNAS; col++) {
        const objetosEnCol = [];
        for (let fila = 0; fila < FILAS; fila++) {
            const index = fila * COLUMNAS + col;
            if (index < adminAllObjectives.length) objetosEnCol.push(adminAllObjectives[index].id);
        }
        if (objetosEnCol.length > 0 && objetosEnCol.every(id => completedIds.includes(id))) {
            lines.push({ tipo: 'vertical', indice: col, nombre: `Columna ${col + 1}`, puntos: 150 });
        }
    }
    if (adminAllObjectives.length >= 12) {
        const esquinas = [0, 2, 15, 17];
        if (esquinas.every(idx => completedIds.includes(adminAllObjectives[idx]?.id))) {
            lines.push({ tipo: 'esquinas', indice: 0, nombre: '4 Esquinas', puntos: 100 });
        }
    }
    if (adminAllObjectives.length > 0 && adminAllObjectives.every(obj => completedIds.includes(obj.id))) {
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

async function limpiarNotificaciones() {
    try {
        const snapshot = await db.collection('notificaciones').get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log('🗑 Notificaciones limpiadas');
    } catch (error) {
        console.error('Error al limpiar notificaciones:', error);
    }
}

async function controlPartida(action) {
    const partidaRef = db.collection('partida').doc('actual');
    const ahora = Date.now();
    
    try {
        switch (action) {
            case 'iniciar':
                await limpiarNotificaciones();
                await partidaRef.set({
                    estado: 'en_curso',
                    pausado: false,
                    tiempo_inicio: firebase.firestore.Timestamp.fromMillis(ahora),
                    tiempo_total: 1800,
                    tiempo_restante: 1800
                }, { merge: true });
                db.collection('notificaciones').add({
                    mensaje: '▶ ¡EL BINGO HA COMENZADO! 🎯',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                adminToast('✅ Bingo iniciado (30 min)');
                break;
                
            case 'pausar':
                if (!currentPartidaData || currentPartidaData.estado !== 'en_curso') {
                    adminToast('❌ No hay partida en curso');
                    return;
                }
                const tiempoInicio = currentPartidaData.tiempo_inicio?.toMillis() || ahora;
                const tiempoTotal = currentPartidaData.tiempo_total || 0;
                const transcurrido = Math.floor((ahora - tiempoInicio) / 1000);
                const restante = Math.max(0, tiempoTotal - transcurrido);
                
                await partidaRef.update({ pausado: true, tiempo_restante: restante });
                db.collection('notificaciones').add({
                    mensaje: '⏸ BINGO PAUSADO',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                adminToast('⏸ Bingo pausado');
                break;
                
            case 'reanudar':
                if (!currentPartidaData || !currentPartidaData.pausado) {
                    adminToast('❌ El bingo no está pausado');
                    return;
                }
                await partidaRef.update({
                    pausado: false,
                    tiempo_inicio: firebase.firestore.Timestamp.fromMillis(ahora),
                    tiempo_total: currentPartidaData.tiempo_restante || 1800,
                    estado: 'en_curso'
                });
                db.collection('notificaciones').add({
                    mensaje: '▶ BINGO REANUDADO',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                adminToast('▶ Bingo reanudado');
                break;
                
            case 'finalizar':
                await partidaRef.update({ estado: 'finalizada', pausado: true });
                db.collection('notificaciones').add({
                    mensaje: '⏹ ¡BINGO FINALIZADO! 🏆',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                adminToast('⏹ Bingo finalizado');
                break;
                
            case 'reiniciar':
                await limpiarNotificaciones();
                await partidaRef.set({
                    estado: 'esperando',
                    pausado: true,
                    tiempo_inicio: null,
                    tiempo_total: 1800,
                    tiempo_restante: 1800
                });
                const batch = db.batch();
                adminAllTeams.forEach(team => {
                    batch.update(db.collection('equipos').doc(team.id), {
                        puntos: 0,
                        objetivos_completados: [],
                        bingos_ganados: []
                    });
                });
                await batch.commit();
                db.collection('notificaciones').add({
                    mensaje: '🔄 BINGO REINICIADO - ¡Nueva partida!',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                adminToast('🔄 Bingo reiniciado');
                break;
        }
    } catch (error) {
        console.error('Error:', error);
        adminToast('❌ Error: ' + error.message);
    }
}

function addTime(seconds) {
    if (!currentPartidaData) { adminToast('❌ Inicia el bingo primero'); return; }
    
    const ahora = Date.now();
    const tiempoInicio = currentPartidaData.tiempo_inicio?.toMillis() || ahora;
    const transcurrido = Math.floor((ahora - tiempoInicio) / 1000);
    const restanteActual = Math.max(0, (currentPartidaData.tiempo_total || 0) - transcurrido);
    const nuevoTotal = restanteActual + seconds;
    
    db.collection('partida').doc('actual').update({
        tiempo_total: nuevoTotal,
        tiempo_restante: nuevoTotal,
        tiempo_inicio: firebase.firestore.Timestamp.fromMillis(ahora),
        pausado: false,
        estado: 'en_curso'
    });
    
    db.collection('notificaciones').add({
        mensaje: `⏱ +${seconds/60} minutos agregados (${formatTimeAdmin(nuevoTotal)} restantes)`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    adminToast(`⏱ +${seconds/60} minutos`);
}

function setManualTime() {
    const input = document.getElementById('manualTimeInput');
    const seconds = parseInt(input.value);
    if (isNaN(seconds) || seconds <= 0) { adminToast('❌ Valor inválido'); return; }
    
    const ahora = Date.now();
    db.collection('partida').doc('actual').update({
        tiempo_total: seconds,
        tiempo_restante: seconds,
        tiempo_inicio: firebase.firestore.Timestamp.fromMillis(ahora),
        pausado: false,
        estado: 'en_curso'
    });
    
    db.collection('notificaciones').add({
        mensaje: `⏱ Tiempo establecido a ${formatTimeAdmin(seconds)}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    adminToast(`⏱ Tiempo: ${formatTimeAdmin(seconds)}`);
    input.value = '';
}

function updateAdminTimer() {
    const display = document.getElementById('adminTimerDisplay');
    if (!display) return;
    
    if (adminTimerInterval) { clearInterval(adminTimerInterval); adminTimerInterval = null; }
    
    if (!currentPartidaData || currentPartidaData.estado === 'esperando') {
        display.textContent = '--:--';
        return;
    }
    
    if (currentPartidaData.estado === 'finalizada') {
        display.textContent = 'FINALIZADO';
        return;
    }
    
    if (currentPartidaData.pausado) {
        const restante = currentPartidaData.tiempo_restante || currentPartidaData.tiempo_total || 0;
        display.textContent = formatTimeAdmin(restante) + ' ⏸';
        return;
    }
    
    const update = () => {
        if (!currentPartidaData || currentPartidaData.pausado) return;
        const ahora = Date.now();
        const inicio = currentPartidaData.tiempo_inicio?.toMillis() || ahora;
        const total = currentPartidaData.tiempo_total || 0;
        const restante = Math.max(0, total - Math.floor((ahora - inicio) / 1000));
        display.textContent = formatTimeAdmin(restante);
        if (restante <= 0) { clearInterval(adminTimerInterval); adminTimerInterval = null; }
    };
    
    update();
    adminTimerInterval = setInterval(update, 1000);
}

function formatTimeAdmin(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function renderTeamsList() {
    const container = document.getElementById('teamsListAdmin');
    container.innerHTML = adminAllTeams.map(team => `
        <div class="objective-list-item">
            <span class="team-dot" style="background:${team.color || '#888'};color:${team.color || '#888'};"></span>
            <span style="flex:1;font-weight:600;">${team.nombre || team.id}</span>
            <span style="color:#ffd700;margin-right:10px;">${team.puntos || 0} pts</span>
            <button class="btn-gamer btn-revoke" style="font-size:0.7rem;padding:5px 10px;" onclick="deleteTeam('${team.id}')">🗑</button>
            <button class="btn-gamer" style="font-size:0.7rem;padding:5px 10px;" onclick="resetTeam('${team.id}')">🔄</button>
        </div>
    `).join('') || '<p style="color:var(--text-secondary);">No hay equipos.</p>';
}

function showCreateTeamForm() {
    const name = prompt('Nombre del equipo:');
    if (!name) return;
    const color = prompt('Color (ej: #ff4444):', '#888888');
    if (!color) return;
    const teamId = name.toLowerCase().replace(/\s+/g, '_');
    db.collection('equipos').doc(teamId).set({
        nombre: name, color: color, puntos: 0,
        objetivos_completados: [], bingos_ganados: [],
        jugador_nombre: '', jugador_uid: ''
    }).then(() => adminToast('✅ Equipo creado: ' + name))
      .catch(err => adminToast('❌ Error: ' + err.message));
}

async function deleteTeam(teamId) {
    if (!confirm('¿Eliminar este equipo?')) return;
    await db.collection('equipos').doc(teamId).delete();
    adminToast('🗑 Equipo eliminado');
}

async function resetTeam(teamId) {
    if (!confirm('¿Resetear puntuación de este equipo?')) return;
    await db.collection('equipos').doc(teamId).update({
        puntos: 0, objetivos_completados: [], bingos_ganados: []
    });
    adminToast('🔄 Puntuación reseteada');
}

function renderObjectivesList() {
    const container = document.getElementById('objectivesListAdmin');
    container.innerHTML = adminAllObjectives.map(obj => `
        <div class="objective-list-item">
            <img src="${obj.imagen}" class="obj-img" onerror="this.src='https://via.placeholder.com/40/2a2a3a/ffffff?text=?'">
            <span style="flex:1;font-weight:600;">${obj.nombre}</span>
            <span style="color:#ffd700;font-size:0.8rem;">+${obj.puntos || 0}</span>
            <button class="btn-gamer btn-revoke" style="font-size:0.7rem;padding:5px 10px;" onclick="deleteObjective('${obj.id}')">🗑</button>
        </div>
    `).join('') || '<p style="color:var(--text-secondary);">No hay objetivos.</p>';
}

function showCreateObjectiveForm() {
    const name = prompt('Nombre del objetivo:');
    if (!name) return;
    const points = parseInt(prompt('Puntos:', '100'));
    if (isNaN(points)) return;
    const imageUrl = prompt('URL de imagen (opcional):', '');
    const objId = name.toLowerCase().replace(/\s+/g, '_');
    db.collection('objetivos').doc(objId).set({
        nombre: name, puntos: points, imagen: imageUrl || '',
        orden: adminAllObjectives.length + 1
    }).then(() => adminToast('✅ Objetivo: ' + name))
      .catch(err => adminToast('❌ Error: ' + err.message));
}

async function deleteObjective(objId) {
    if (!confirm('¿Eliminar este objetivo?')) return;
    await db.collection('objetivos').doc(objId).delete();
    adminToast('🗑 Objetivo eliminado');
}

async function sendNotification() {
    const input = document.getElementById('notificationInput');
    const message = input.value.trim();
    if (!message) return;
    await db.collection('notificaciones').add({
        mensaje: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
    adminToast('📤 Notificación enviada');
}

function quickNotification(msg) {
    document.getElementById('notificationInput').value = msg;
    sendNotification();
}

function triggerEvent(type) {
    let mensaje = '';
    switch (type) {
        case 'duplicar': mensaje = '🔥 EVENTO: ¡Puntos duplicados por 5 minutos!'; break;
        case 'muerte_subita': mensaje = '💀 EVENTO: ¡Muerte súbita activada!'; break;
        case 'tiempo_extra': mensaje = '⚡ EVENTO: ¡Tiempo extra! +5 min'; addTime(300); break;
        default: mensaje = '⚡ Evento especial activado';
    }
    db.collection('notificaciones').add({
        mensaje, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    adminToast(mensaje);
}

function triggerCustomEvent() {
    const msg = prompt('Mensaje del evento personalizado:');
    if (!msg) return;
    db.collection('notificaciones').add({
        mensaje: '🎯 ' + msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    adminToast('🎯 Evento personalizado enviado');
}

function adminToast(message) {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;
    
    const existingToasts = container.querySelectorAll('.toast-msg');
    if (existingToasts.length >= 3) existingToasts[0].remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `${message} <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toastOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }
    }, 3000);
}
