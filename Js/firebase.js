// ==========================================
// Firebase Configuration
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBNUZgwbquY_tsBtkbRC9p6jV6GHV4sUAc",
  authDomain: "bingo-ff.firebaseapp.com",
  projectId: "bingo-ff",
  storageBucket: "bingo-ff.firebasestorage.app",
  messagingSenderId: "645772001080",
  appId: "1:645772001080:web:b34e7ec7009d7a3dcb0bcd"
};

// ==========================================
// Inicializar Firebase
// ==========================================

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

console.log("🔥 Firebase inicializado correctamente");

// ==========================================
// Prueba de conexión a Firestore
// ==========================================

async function probarConexion() {
  try {
      console.log("⏳ Probando conexión con Firestore...");

      const docRef = db.collection("partida").doc("actual");
      const docSnap = await docRef.get();

      if (docSnap.exists) {
          console.log("✅ Firestore conectado correctamente");
          console.log("📄 Datos de partida:", docSnap.data());
      } else {
          console.warn("⚠️ El documento partida/actual no existe");
          console.log("🔄 Creando documento partida/actual...");
          await docRef.set({
              estado: "esperando",
              pausado: true,
              tiempo_total: 1800,
              tiempo_restante: 1800
          });
          console.log("✅ Documento partida/actual creado");
      }
  } catch (error) {
      console.error("❌ Error al conectar con Firebase:");
      console.error(error);
  }
}

// ==========================================
// Cargar los 18 objetos iniciales
// ==========================================

async function cargarObjetosIniciales() {
  const objetos = [
    { id: "dron_curativo", nombre: "Dron curativo", puntos: 20, imagen: "https://i.ibb.co/WNC60Hnk/Whats-App-Image-2026-06-05-at-15-19-39-1.png", orden: 1 },
    { id: "granada_gloo", nombre: "Granada Gloo", puntos: 10, imagen: "https://i.ibb.co/8L7cRsbK/Whats-App-Image-2026-06-05-at-15-19-39.png", orden: 2 },
    { id: "trogon", nombre: "Trogon", puntos: 15, imagen: "https://i.ibb.co/mrp3r6wz/7e251bd1-0658-4397-8e1c-23e8f6660cd8.png", orden: 3 },
    { id: "destello_hielo", nombre: "Destello de hielo", puntos: 15, imagen: "https://i.ibb.co/ksr4qJvH/Whats-App-Image-2026-06-05-at-15-14-35.png", orden: 4 },
    { id: "inhalador_azul", nombre: "Inhalador Azul", puntos: 20, imagen: "https://i.ibb.co/TMBmg70H/Whats-App-Image-2026-06-05-at-15-12-48.png", orden: 5 },
    { id: "scar_3chips", nombre: "Scar con 3 chips", puntos: 25, imagen: "https://i.ibb.co/4Znk05Wy/Whats-App-Image-2026-06-05-at-15-10-51.png", orden: 6 },
    { id: "kit_reparacion", nombre: "Kit de reparación", puntos: 10, imagen: "https://i.ibb.co/v6bjHmyz/8eb13fd1-5db3-4e68-a1a3-fcfab78e9e73.png", orden: 7 },
    { id: "horizonalina", nombre: "Horizonalina", puntos: 25, imagen: "https://i.ibb.co/spmRDSmr/Whats-App-Image-2026-06-05-at-16-16-21.png", orden: 8 },
    { id: "kord", nombre: "Kord", puntos: 20, imagen: "https://i.ibb.co/wrxg9ypD/Whats-App-Image-2026-06-05-at-16-16-20-3.png", orden: 9 },
    { id: "pistola_curativa_y", nombre: "Pistola Curativa Y", puntos: 20, imagen: "https://i.ibb.co/7JNj0CMv/Whats-App-Image-2026-06-05-at-16-16-20-4.png", orden: 10 },
    { id: "doble_pistola", nombre: "Doble pistola", puntos: 20, imagen: "https://i.ibb.co/hRSRZK3k/Whats-App-Image-2026-06-05-at-16-16-20-2.png", orden: 11 },
    { id: "3500_monedas", nombre: "3500 monedas", puntos: 25, imagen: "https://i.ibb.co/VcsGbWrJ/Whats-App-Image-2026-06-05-at-16-16-20-1.png", orden: 12 },
    { id: "thompson_x", nombre: "Thompson X", puntos: 25, imagen: "https://i.ibb.co/k2HcjLb3/Whats-App-Image-2026-06-05-at-16-16-19-3.png", orden: 13 },
    { id: "silenciador", nombre: "Silenciador", puntos: 15, imagen: "https://i.ibb.co/bMCXWtNv/Whats-App-Image-2026-06-05-at-16-16-20.png", orden: 14 },
    { id: "vss", nombre: "VSS", puntos: 10, imagen: "https://i.ibb.co/qM6LXMBd/Whats-App-Image-2026-06-05-at-16-16-19-2.png", orden: 15 },
    { id: "awm", nombre: "AWM", puntos: 15, imagen: "https://i.ibb.co/bj47nPqX/Whats-App-Image-2026-06-05-at-16-16-19-1.png", orden: 16 },
    { id: "culata_al_3", nombre: "Culata al 3", puntos: 15, imagen: "https://i.ibb.co/rKyrKZGt/Whats-App-Image-2026-06-05-at-16-16-19.png", orden: 17 },
    { id: "congelacion_draconica", nombre: "Congelación dracónica", puntos: 10, imagen: "https://i.ibb.co/KjWRGqfS/Whats-App-Image-2026-06-05-at-16-37-51.png", orden: 18 }
  ];

  try {
    console.log("⏳ Verificando objetivos existentes...");
    const snapshot = await db.collection("objetivos").get();
    
    if (snapshot.empty) {
      console.log("📦 Cargando 18 objetos iniciales...");
      const batch = db.batch();
      objetos.forEach(obj => {
        const ref = db.collection("objetivos").doc(obj.id);
        batch.set(ref, obj);
      });
      await batch.commit();
      console.log("✅ 18 objetos cargados correctamente");
    } else {
      console.log(`✅ Ya existen ${snapshot.size} objetos en Firestore`);
    }
  } catch (error) {
    console.error("❌ Error al cargar objetos:", error);
  }
}

// ==========================================
// Ejecutar al iniciar
// ==========================================

probarConexion();
cargarObjetosIniciales();