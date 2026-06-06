// ============================================
// BINGO FF LIVE - Dashboard Administrador
// ============================================

let adminUnsubscribes = [], adminAllTeams = [], adminAllObjectives = [], currentPartidaData = null, adminTimerInterval = null;
const FILAS = 6, COLUMNAS = 3;

function loginAdmin() {
    const email = document.getElementById('adminEmail').value.trim(), password = document.getElementById('adminPassword').value.trim(), errorEl = document.getElementById('loginError');
    if (!email || !password) { errorEl.textContent = 'Completa todos los campos.'; errorEl.style.display = 'block'; return; }
    auth.signInWithEmailAndPassword(email, password).then(uc => db.collection('usuarios').doc(uc.user.uid).get()).then(doc => {
        if (doc.exists && doc.data().rol === 'admin') showDashboard(auth.currentUser);
        else { auth.signOut(); errorEl.textContent = 'No tienes permisos.'; errorEl.style.display = 'block'; }
    }).catch(error => { errorEl.textContent = 'Error: ' + error.message; errorEl.style.display = 'block'; });
}

function logoutAdmin() { adminUnsubscribes.forEach(u => u()); adminUnsubscribes = []; if (adminTimerInterval) clearInterval(adminTimerInterval); auth.signOut(); document.getElementById('dashboardScreen').style.display = 'none'; document.getElementById('loginScreen').style.display = 'flex'; }

function showDashboard(user) { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('dashboardScreen').style.display = 'block'; document.getElementById('adminUserEmail').textContent = user?.email || 'Admin'; setupAdminListeners(); }

auth.onAuthStateChanged(user => {
    if (user) db.collection('usuarios').doc(user.uid).get().then(doc => { if (doc.exists && doc.data().rol === 'admin') showDashboard(user); else { auth.signOut(); document.getElementById('loginScreen').style.display = 'flex'; } });
    else { document.getElementById('loginScreen').style.display = 'flex'; document.getElementById('dashboardScreen').style.display = 'none'; }
});

function setupAdminListeners() {
    adminUnsubscribes.forEach(u => u()); adminUnsubscribes = [];
    adminUnsubscribes.push(db.collection('equipos').onSnapshot(s => { adminAllTeams = []; s.forEach(d => adminAllTeams.push({ id: d.id, ...d.data() })); renderTeamsList(); populateTeamSelect(); loadTeamObjectives(); }));
    adminUnsubscribes.push(db.collection('objetivos').orderBy('orden').onSnapshot(s => { adminAllObjectives = []; s.forEach(d => adminAllObjectives.push({ id: d.id, ...d.data() })); renderObjectivesList(); loadTeamObjectives(); }));
    adminUnsubscribes.push(db.collection('partida').doc('actual').onSnapshot(d => { if (d.exists) { currentPartidaData = d.data(); updateAdminTimer(); } }));
}

function populateTeamSelect() { const s = document.getElementById('validationTeamSelect'), v = s.value; s.innerHTML = '<option value="">-- Seleccionar --</option>'; adminAllTeams.forEach(t => s.innerHTML += `<option value="${t.id}">${t.nombre || t.id}</option>`); if (v && adminAllTeams.some(t => t.id === v)) s.value = v; }

function loadTeamObjectives() {
    const teamId = document.getElementById('validationTeamSelect').value, container = document.getElementById('validationObjectivesList');
    if (!teamId) { container.innerHTML = '<p style="color:#a0a0b0;">Selecciona un equipo.</p>'; return; }
    const team = adminAllTeams.find(t => t.id === teamId);
    if (!team) return;
    const completedIds = team.objetivos_completados || [], total = completedIds.filter(id => adminAllObjectives.some(o => o.id === id)).length;
    const lines = calcularLineasCompletadas(completedIds), bingoPts = lines.reduce((s, l) => s + l.puntos, 0);
    let html = `<div style="background:${team.color||'#888'}20;border:1px solid ${team.color||'#888'};border-radius:10px;padding:12px;margin-bottom:15px;text-align:center;"><strong>${team.nombre||team.id}</strong> | <span style="color:#ffd700;">${team.puntos||0} pts</span> | ${total}/${adminAllObjectives.length}${bingoPts>0?` | <span style="color:#00ff88;">Bingos:+${bingoPts}</span>`:''}</div><div class="bingo-grid-3x6" style="margin-bottom:15px;">`;
    adminAllObjectives.forEach((obj, i) => {
        const ok = completedIds.includes(obj.id), f = Math.floor(i/COLUMNAS), c = i%COLUMNAS, enLinea = verificarObjetoEnLinea(f, c, lines);
        html += `<div class="bingo-item ${ok?'completed':''} ${ok&&enLinea?'bingo-line':''}" onclick="toggleObjectiveAdmin('${teamId}','${obj.id}',${!ok})" style="cursor:pointer;"><div class="item-position">${f+1},${c+1}</div><img src="${obj.imagen}" class="item-img" onerror="this.src='https://via.placeholder.com/40/2a2a3a/ffffff?text=?'"><div class="item-name">${obj.nombre}</div><div class="item-points">+${obj.puntos||0}</div><div class="item-status ${ok?'done':'pending'}">${ok?'✓ Revocar':'□ Aprobar'}</div></div>`;
    });
    html += '</div>';
    if (lines.length > 0) html += `<div style="background:rgba(255,215,0,0.1);border:1px solid #ffd700;border-radius:8px;padding:10px;text-align:center;">🏆 ${lines.map(l=>`${l.nombre}(+${l.puntos})`).join(', ')}</div>`;
    container.innerHTML = html;
}

async function toggleObjectiveAdmin(teamId, objectiveId, approve) {
    const team = adminAllTeams.find(t => t.id === teamId), obj = adminAllObjectives.find(o => o.id === objectiveId);
    if (!team || !obj) return;
    let completed = [...(team.objetivos_completados||[])], puntos = team.puntos||0, bingos = [...(team.bingos_ganados||[])];
    if (approve && !completed.includes(objectiveId)) {
        completed.push(objectiveId); puntos += obj.puntos||0;
        const nl = calcularLineasCompletadas(completed), pl = calcularLineasCompletadas(team.objetivos_completados||[]);
        nl.filter(n=>!pl.some(p=>p.tipo===n.tipo&&p.indice===n.indice)).forEach(b=>{puntos+=b.puntos;bingos.push(`${b.tipo}_${b.indice}_${Date.now()}`);});
    } else if (!approve && completed.includes(objectiveId)) {
        completed = completed.filter(id=>id!==objectiveId);
        const rl = calcularLineasCompletadas(completed);
        puntos = completed.reduce((s,id)=>{const o=adminAllObjectives.find(x=>x.id===id);return s+(o?.puntos||0);},0) + rl.reduce((s,l)=>s+l.puntos,0);
        bingos = [];
    }
    await db.collection('equipos').doc(teamId).update({objetivos_completados:completed,puntos,bingos_ganados:bingos});
    db.collection('notificaciones').add({mensaje:`${approve?'✅':'✗'} ${obj.nombre} → ${team.nombre||teamId}`,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
    adminToast(`${approve?'✅':'✗'} ${obj.nombre}`); loadTeamObjectives();
}

function calcularLineasCompletadas(ids) {
    const lines = [];
    for(let f=0;f<FILAS;f++){const row=[];for(let c=0;c<COLUMNAS;c++){const i=f*COLUMNAS+c;if(i<adminAllObjectives.length)row.push(adminAllObjectives[i].id);}if(row.length>0&&row.every(id=>ids.includes(id)))lines.push({tipo:'horizontal',indice:f,nombre:`Fila ${f+1}`,puntos:100});}
    for(let c=0;c<COLUMNAS;c++){const col=[];for(let f=0;f<FILAS;f++){const i=f*COLUMNAS+c;if(i<adminAllObjectives.length)col.push(adminAllObjectives[i].id);}if(col.length>0&&col.every(id=>ids.includes(id)))lines.push({tipo:'vertical',indice:c,nombre:`Columna ${c+1}`,puntos:150});}
    if(adminAllObjectives.length>=12&&[0,2,15,17].every(i=>ids.includes(adminAllObjectives[i]?.id)))lines.push({tipo:'esquinas',indice:0,nombre:'4 Esquinas',puntos:100});
    if(adminAllObjectives.length>0&&adminAllObjectives.every(o=>ids.includes(o.id)))lines.push({tipo:'llena',indice:0,nombre:'¡BINGO TOTAL!',puntos:300});
    return lines;
}
function verificarObjetoEnLinea(f,c,lines){return lines.some(l=>(l.tipo==='horizontal'&&l.indice===f)||(l.tipo==='vertical'&&l.indice===c)||(l.tipo==='esquinas'&&((f===0||f===5)&&(c===0||c===2)))||l.tipo==='llena');}

async function limpiarNotificaciones(){const s=await db.collection('notificaciones').get();const b=db.batch();s.forEach(d=>b.delete(d.ref));await b.commit();}

async function controlPartida(action){
    const ref=db.collection('partida').doc('actual'),ahora=Date.now();
    try{
        switch(action){
            case'iniciar':await limpiarNotificaciones();await ref.set({estado:'en_curso',pausado:false,tiempo_inicio:firebase.firestore.Timestamp.fromMillis(ahora),tiempo_total:1800,tiempo_restante:1800},{merge:true});db.collection('notificaciones').add({mensaje:'▶ ¡BINGO COMENZADO!',timestamp:firebase.firestore.FieldValue.serverTimestamp()});adminToast('✅ Iniciado');break;
            case'pausar':if(currentPartidaData){const t=Math.floor((ahora-(currentPartidaData.tiempo_inicio?.toMillis()||ahora))/1000);await ref.update({pausado:true,tiempo_restante:Math.max(0,(currentPartidaData.tiempo_total||0)-t)});adminToast('⏸ Pausado');}break;
            case'reanudar':if(currentPartidaData?.pausado){await ref.update({pausado:false,tiempo_inicio:firebase.firestore.Timestamp.fromMillis(ahora),tiempo_total:currentPartidaData.tiempo_restante||0,estado:'en_curso'});adminToast('▶ Reanudado');}break;
            case'finalizar':await ref.update({estado:'finalizada',pausado:true});db.collection('notificaciones').add({mensaje:'⏹ ¡BINGO FINALIZADO!',timestamp:firebase.firestore.FieldValue.serverTimestamp()});adminToast('⏹ Finalizado');break;
            case'reiniciar':await limpiarNotificaciones();await ref.set({estado:'esperando',pausado:true,tiempo_inicio:null,tiempo_total:1800,tiempo_restante:1800});const batch=db.batch();adminAllTeams.forEach(t=>batch.update(db.collection('equipos').doc(t.id),{puntos:0,objetivos_completados:[],bingos_ganados:[]}));await batch.commit();adminToast('🔄 Reiniciado');break;
        }
    }catch(e){adminToast('❌ Error: '+e.message);}
}

function addTime(s){if(!currentPartidaData){adminToast('❌ Inicia el bingo');return;}const t=(currentPartidaData.tiempo_total||0)+s;db.collection('partida').doc('actual').update({tiempo_total:t,tiempo_restante:t,tiempo_inicio:firebase.firestore.Timestamp.fromMillis(Date.now())});adminToast(`⏱ +${s/60}min`);}
function setManualTime(){const s=parseInt(document.getElementById('manualTimeInput').value);if(isNaN(s)||s<=0){adminToast('❌ Valor inválido');return;}db.collection('partida').doc('actual').update({tiempo_total:s,tiempo_restante:s,tiempo_inicio:firebase.firestore.Timestamp.fromMillis(Date.now()),pausado:false,estado:'en_curso'});adminToast('⏱ '+formatTimeAdmin(s));}
function updateAdminTimer(){const d=document.getElementById('adminTimerDisplay');if(!currentPartidaData||currentPartidaData.estado==='esperando'){d.textContent='--:--';return;}if(currentPartidaData.estado==='finalizada'){d.textContent='FINALIZADO';return;}if(adminTimerInterval)clearInterval(adminTimerInterval);const u=()=>{if(currentPartidaData.pausado){d.textContent=formatTimeAdmin(currentPartidaData.tiempo_restante||0)+' ⏸';return;}const r=Math.max(0,(currentPartidaData.tiempo_total||0)-Math.floor((Date.now()-(currentPartidaData.tiempo_inicio?.toMillis()||Date.now()))/1000));d.textContent=formatTimeAdmin(r);};u();adminTimerInterval=setInterval(u,1000);}
function formatTimeAdmin(s){const m=Math.floor(s/60);return`${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

function renderTeamsList(){document.getElementById('teamsListAdmin').innerHTML=adminAllTeams.map(t=>`<div class="objective-list-item"><span class="team-dot" style="background:${t.color||'#888'};color:${t.color||'#888'};"></span><span style="flex:1;">${t.nombre||t.id}</span><span style="color:#ffd700;">${t.puntos||0}pts</span><button class="btn-gamer btn-revoke" style="font-size:0.7rem;padding:5px 10px;" onclick="deleteTeam('${t.id}')">🗑</button><button class="btn-gamer" style="font-size:0.7rem;padding:5px 10px;" onclick="resetTeam('${t.id}')">🔄</button></div>`).join('')||'<p>No hay equipos.</p>';}
function showCreateTeamForm(){const n=prompt('Nombre:'),c=prompt('Color (#ff4444):','#888888');if(!n||!c)return;db.collection('equipos').doc(n.toLowerCase().replace(/\s+/g,'_')).set({nombre:n,color:c,puntos:0,objetivos_completados:[],bingos_ganados:[],jugador_nombre:'',jugador_uid:''}).then(()=>adminToast('✅ '+n));}
async function deleteTeam(id){if(!confirm('¿Eliminar?'))return;await db.collection('equipos').doc(id).delete();adminToast('🗑 Eliminado');}
async function resetTeam(id){if(!confirm('¿Resetear?'))return;await db.collection('equipos').doc(id).update({puntos:0,objetivos_completados:[],bingos_ganados:[]});adminToast('🔄 Reseteado');}

function renderObjectivesList(){document.getElementById('objectivesListAdmin').innerHTML=adminAllObjectives.map(o=>`<div class="objective-list-item"><img src="${o.imagen}" class="obj-img" onerror="this.src='https://via.placeholder.com/40/2a2a3a/ffffff?text=?'"><span style="flex:1;">${o.nombre}</span><span style="color:#ffd700;">+${o.puntos||0}</span><button class="btn-gamer btn-revoke" style="font-size:0.7rem;padding:5px 10px;" onclick="deleteObjective('${o.id}')">🗑</button></div>`).join('')||'<p>No hay objetivos.</p>';}
function showCreateObjectiveForm(){const n=prompt('Nombre:'),p=parseInt(prompt('Puntos:','100')),img=prompt('URL imagen:','');if(!n||isNaN(p))return;db.collection('objetivos').doc(n.toLowerCase().replace(/\s+/g,'_')).set({nombre:n,puntos:p,imagen:img||'',orden:adminAllObjectives.length+1}).then(()=>adminToast('✅ '+n));}
async function deleteObjective(id){if(!confirm('¿Eliminar?'))return;await db.collection('objetivos').doc(id).delete();adminToast('🗑 Eliminado');}

async function sendNotification(){const m=document.getElementById('notificationInput').value.trim();if(!m)return;await db.collection('notificaciones').add({mensaje:m,timestamp:firebase.firestore.FieldValue.serverTimestamp()});document.getElementById('notificationInput').value='';adminToast('📤 Enviada');}
function quickNotification(m){document.getElementById('notificationInput').value=m;sendNotification();}
function triggerEvent(t){let m='';switch(t){case'duplicar':m='🔥 Puntos duplicados!';break;case'muerte_subita':m='💀 Muerte súbita!';break;case'tiempo_extra':m='⚡ Tiempo extra!';addTime(300);break;}db.collection('notificaciones').add({mensaje:m,timestamp:firebase.firestore.FieldValue.serverTimestamp()});adminToast(m);}
function triggerCustomEvent(){const m=prompt('Mensaje:');if(!m)return;db.collection('notificaciones').add({mensaje:'🎯 '+m,timestamp:firebase.firestore.FieldValue.serverTimestamp()});adminToast('🎯 Enviado');}

function adminToast(m){const c=document.getElementById('adminToastContainer');if(!c)return;if(c.querySelectorAll('.toast-msg').length>=3)c.querySelector('.toast-msg').remove();const t=document.createElement('div');t.className='toast-msg';t.innerHTML=`${m}<button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;c.appendChild(t);setTimeout(()=>{if(t.parentNode){t.style.animation='toastOut 0.4s ease forwards';setTimeout(()=>t.remove(),400);}},3000);}