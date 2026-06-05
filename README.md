# 🎯 Bingo FF Live

![Bingo FF Live](https://img.shields.io/badge/Free%20Fire-Bingo%20Live-orange?style=for-the-badge) ![Firebase](https://img.shields.io/badge/Firebase-Realtime-FFCA28?style=for-the-badge&logo=firebase) ![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript) ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Aplicación web para dinámicas de Bingo en Free Fire entre equipos**

---

## 📋 Índice
- [🎯 Descripción](#-descripción)
- [✨ Características](#-características)
- [🛠️ Tecnologías](#️-tecnologías)
- [📦 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔥 Configuración de Firebase](#-configuración-de-firebase)
- [⚡ Instalación y Despliegue](#-instalación-y-despliegue)
- [🎯 Cómo Usar](#-cómo-usar)
- [📊 Estructura de Firestore](#-estructura-de-firestore)
- [🔒 Reglas de Seguridad](#-reglas-de-seguridad)
- [🤝 Contribuir](#-contribuir)
- [📝 Licencia](#-licencia)
- [📧 Contacto](#-contacto)

---

## 🎯 Descripción

**Bingo FF Live** es una aplicación web diseñada para realizar dinámicas de Bingo durante partidas de Free Fire. Los equipos compiten completando una cartilla de 18 objetos, ganando puntos por cada objeto encontrado y bonificaciones por completar líneas.

### ¿Cómo funciona?
1. El **Administrador** crea los equipos y controla la partida
2. Los **Jugadores** se unen a un equipo y marcan los objetos que encuentran
3. Los puntos se actualizan en **tiempo real** para todos
4. El equipo con más puntos al finalizar el tiempo **gana**

---

## ✨ Características

### 🎮 Para Jugadores
- Unirse a cualquier equipo disponible
- Cartilla interactiva 3x6 con 18 objetos
- Marcar/desmarcar objetos encontrados
- Ranking en vivo con posiciones
- Temporizador en tiempo real
- Notificaciones de eventos
- Confeti al completar cartilla llena

### 🔐 Para Administradores
- Dashboard completo de control
- Crear/eliminar equipos dinámicamente
- Control de tiempo (iniciar, pausar, reanudar, finalizar)
- Agregar tiempo extra (+5 min, +10 min)
- Validar objetivos manualmente
- Enviar notificaciones globales
- Eventos especiales (duplicar puntos, muerte súbita)
- Reiniciar partida completa

### 🏆 Sistema de Puntuación
| Logro | Puntos |
|-------|--------|
| Objeto completado | 10-25 pts (según objeto) |
| Línea horizontal | +100 pts |
| Línea vertical | +150 pts |
| 4 esquinas | +100 pts |
| Cartilla llena | +300 pts |

### 🎨 Diseño
- Modo oscuro gamer
- 100% Responsive (PC, tablet, móvil)
- Animaciones suaves
- Efectos visuales (confeti, brillos)
- Colores dinámicos por equipo

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| HTML5 | Estructura de la aplicación |
| CSS3 | Estilos y animaciones |
| JavaScript Vanilla | Lógica del cliente |
| Bootstrap 5 | Componentes responsive |
| Firebase Firestore | Base de datos en tiempo real |
| Firebase Auth | Autenticación de administradores |
| Firebase Hosting | Despliegue en producción |

---

## 📦 Estructura del Proyecto
bingo-ff-live/
├── index.html # Pantalla principal + Vista de equipo
├── admin.html # Panel de administración
├── css/
│ └── styles.css # Tema gamer oscuro + responsive
├── js/
│ ├── firebase.js # Configuración de Firebase
│ ├── app.js # Lógica de equipos y cartilla
│ └── admin.js # Lógica del dashboard
├── firestore.rules # Reglas de seguridad
└── README.md # Documentación

---

## 🔥 Configuración de Firebase

### 1. Crear proyecto en Firebase
1. Ve a Firebase Console: https://console.firebase.google.com/
2. Crea un nuevo proyecto: bingo-ff-live
3. Habilita Firestore Database en modo producción
4. Habilita Authentication → Correo electrónico/contraseña
5. Registra una aplicación web (ícono </>)

### 2. Configurar credenciales
Copia tu configuración de Firebase y pégala en js/firebase.js

### 3. Crear usuario administrador
1. En Authentication → Users → Agregar usuario
2. Email: admin@bingo.com | Contraseña: admin123
3. Copia el UID del usuario creado
4. En Firestore, crea colección usuarios → documento con el UID copiado:
   - rol: "admin"
   - email: "admin@bingo.com"

### 4. Datos iniciales
- Los 18 objetos se cargan automáticamente al iniciar la aplicación
- El documento partida/actual se crea automáticamente si no existe
- Los equipos se crean desde el panel de administración

### 5. Configurar reglas de seguridad
Copia el contenido de firestore.rules en Firestore Database → Reglas

---

## ⚡ Instalación y Despliegue

### Opción 1: Firebase Hosting (Recomendado)
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting


### Opción 2: GitHub Pages
1. Sube el código a un repositorio de GitHub
2. Ve a Settings → Pages
3. Selecciona rama main y carpeta / (root)
4. Guarda y espera la publicación

### Opción 3: Servidor Local

python -m http.server 8000
npx serve .


---

## 🎯 Cómo Usar

### Administrador
1. Accede a admin.html
2. Inicia sesión con email y contraseña
3. Crea equipos desde el botón + Crear Equipo
4. Configura el tiempo y haz clic en Iniciar Bingo
5. Monitorea el progreso en tiempo real
6. Usa las notificaciones para comunicarte con los jugadores
7. Al finalizar, haz clic en Finalizar Bingo

### Jugadores
1. Accede a index.html
2. Selecciona tu equipo de la lista
3. Ingresa tu nombre de jugador
4. Haz clic en los objetos que encuentres durante la partida
5. Confirma cada objeto encontrado
6. Mira el ranking para seguir tu posición
7. Completa líneas para ganar puntos extra

---

## 📊 Estructura de Firestore

### Colección: equipos
- nombre: "Equipo Rojo"
- color: "#ff4444"
- puntos: 450
- objetivos_completados: ["awm", "mp40", "vss"]
- bingos_ganados: ["horizontal_0_1234567890"]
- jugador_nombre: "ProPlayer"
- jugador_uid: "123456789"

### Colección: objetivos
- nombre: "AWM"
- puntos: 15
- imagen: "https://i.ibb.co/..."
- orden: 16

### Colección: partida
- estado: "en_curso"
- pausado: false
- tiempo_inicio: Timestamp
- tiempo_total: 1800
- tiempo_restante: 1200

### Colección: notificaciones
- mensaje: "Equipo Rojo completó: AWM (+15 pts)"
- timestamp: Timestamp

### Colección: usuarios
- rol: "admin"
- email: "admin@bingo.com"

---

## 🔒 Reglas de Seguridad

- Lectura pública para equipos, objetivos, partida y notificaciones
- Escritura restringida solo para usuarios con rol admin
- Notificaciones solo pueden ser creadas por administradores
- Usuarios solo accesibles por el propio usuario o administradores

---

## 🤝 Contribuir

1. Haz un Fork del proyecto
2. Crea tu rama: git checkout -b feature/NuevaFuncion
3. Haz commit: git commit -m 'Agrega NuevaFuncion'
4. Haz Push: git push origin feature/NuevaFuncion
5. Abre un Pull Request

### Ideas para contribuir
- Modo torneo con eliminatorias
- Sonidos al completar bingo
- Exportar resultados a PDF
- Temas personalizables
- Chat entre equipos
- Más patrones de bingo
- Estadísticas de partidas anteriores
- Cronómetro de pausas

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 📧 Contacto

- GitHub: @tu-usuario
- Email: tu-email@ejemplo.com

---

⭐ Dale una estrella si te gustó | Hecho con ❤️ para la comunidad de Free Fire
