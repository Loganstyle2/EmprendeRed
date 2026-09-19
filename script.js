// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCNhgB65MZCm7kWPxRaZvCoSGYKwfyfCeM",
  authDomain: "emprendered-90348.firebaseapp.com",
  projectId: "emprendered-90348",
  storageBucket: "emprendered-90348.appspot.com",
  messagingSenderId: "626521746909",
  appId: "1:626521746909:web:61baeaa8814ad258d85a34",
  measurementId: "G-Q4ZPC8BC00"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Estado Global de la Aplicación
let currentUser = null;
let currentTab = localStorage.getItem('emprende_current_tab') || 'feed';
let isAuthRegisterMode = false;
let selectedRatingStars = 0;
let tempImageBase64 = null;
let tempAvatarBase64 = null;
let tempPostImageBase64 = null;

// Arreglos Locales
let users = [];
let posts = [];
let portfolioItems = [];

// --- INICIALIZACIÓN AUTOMÁTICA Y ESCUCHADOR DE AUTENTICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Mantener todo oculto o mostrar un estado de carga sutil al recargar
    const lobbyView = document.getElementById('lobbyView');
    if (lobbyView) lobbyView.classList.add('hidden'); // Ocultar lobby por defecto al cargar

    // Escuchar cambios de estado en Firebase Auth
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario autenticado en Firebase
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUser = { id: user.uid, ...userDoc.data() };
                } else {
                    currentUser = {
                        id: user.uid,
                        name: user.displayName || "Usuario",
                        email: user.email,
                        profession: "Emprendedor",
                        trade: "General",
                        experience: 0,
                        location: "No especificada",
                        bio: "¡Hola! Estoy usando EmprendeRed.",
                        avatar: (user.displayName || "U").charAt(0).toUpperCase(),
                        avatarBg: "#2563eb",
                        avatarImage: null,
                        ratings: [],
                        score: "0.0"
                    };
                }
                localStorage.setItem('emprende_session', JSON.stringify(currentUser));
                showApp();
            } catch (error) {
                console.error("Error al obtener perfil del usuario:", error);
                showLobby(); // Solo si falla la red mostramos el lobby
            }
        } else {
            // No hay usuario activo confirmado por Firebase
            currentUser = null;
            localStorage.removeItem('emprende_session');
            showLobby();
        }
    });
});

// --- AUTENTICACIÓN Y SESIÓN ---

function showLobby() {
    const lobbyView = document.getElementById('lobbyView');
    const mainHeader = document.getElementById('mainHeader');
    const mainApp = document.getElementById('mainApp');
    const mobileNav = document.getElementById('mobileNav');

    if (lobbyView) lobbyView.classList.remove('hidden');
    if (mainHeader) mainHeader.classList.add('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    if (mobileNav) mobileNav.classList.add('hidden');
}

function showApp() {
    const lobbyView = document.getElementById('lobbyView');
    const mainHeader = document.getElementById('mainHeader');
    const mainApp = document.getElementById('mainApp');
    const mobileNav = document.getElementById('mobileNav');

    if (lobbyView) lobbyView.classList.add('hidden');
    if (mainHeader) mainHeader.classList.remove('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    if (mobileNav) mobileNav.classList.remove('hidden');
    
    updateUserUI();
    switchTab(currentTab);
}

function openAuthModal(mode) {
    isAuthRegisterMode = mode === 'register';
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const groupName = document.getElementById('groupName');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');

    if (!modal) return;

    if (isAuthRegisterMode) {
        if (title) title.innerText = "Crear Cuenta";
        if (groupName) groupName.style.display = "block";
        if (submitBtn) submitBtn.innerText = "Registrarse";
        if (switchText) switchText.innerHTML = `¿Ya tienes cuenta? <a href="#" onclick="toggleAuthMode(event)" style="color: var(--accent); font-weight: 600;">Inicia Sesión</a>`;
    } else {
        if (title) title.innerText = "Iniciar Sesión";
        if (groupName) groupName.style.display = "none";
        if (submitBtn) submitBtn.innerText = "Ingresar";
        if (switchText) switchText.innerHTML = `¿No tienes cuenta? <a href="#" onclick="toggleAuthMode(event)" style="color: var(--accent); font-weight: 600;">Regístrate aquí</a>`;
    }

    modal.classList.remove('hidden');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
}

function toggleAuthMode(e) {
    if (e && e.preventDefault) e.preventDefault();
    openAuthModal(isAuthRegisterMode ? 'login' : 'register');
}

async function handleAuthSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const emailEl = document.getElementById('authEmail');
    const passEl = document.getElementById('authPassword');
    
    if (!emailEl || !passEl) return;

    const email = emailEl.value.trim();
    const password = passEl.value.trim();

    try {
        if (isAuthRegisterMode) {
            const nameEl = document.getElementById('authName');
            const name = nameEl ? nameEl.value.trim() : '';
            if (!name) return alert("Por favor ingresa tu nombre.");

            // Crear usuario en Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const userData = {
                id: user.uid,
                name: name,
                email: email,
                profession: "Emprendedor",
                trade: "General",
                experience: 0,
                location: "No especificada",
                bio: "¡Hola! Estoy usando EmprendeRed.",
                avatar: name.charAt(0).toUpperCase(),
                avatarBg: "#2563eb",
                avatarImage: null,
                ratings: [],
                score: "0.0",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Guardar datos en Firestore
            await db.collection('users').doc(user.uid).set(userData);
            currentUser = userData;
        } else {
            // Iniciar sesión con Firebase Auth
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            if (userDoc.exists) {
                currentUser = { id: userCredential.user.uid, ...userDoc.data() };
            }
        }

        closeAuthModal();
    } catch (error) {
        alert("Error en la autenticación: " + error.message);
    }
}

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('emprende_session');
        localStorage.removeItem('emprende_current_tab');
        currentUser = null;
        currentTab = 'feed';
        showLobby();
    }).catch(error => {
        console.error("Error al cerrar sesión:", error);
    });
}

// --- NAVEGACIÓN Y VISTAS ---

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('emprende_current_tab', tab);

    const feedView = document.getElementById('feedView');
    const profileView = document.getElementById('profileView');
    const adBlock = document.getElementById('adBlock');
    const profileDetailsCard = document.getElementById('profileDetailsCard');
    const navHome = document.getElementById('navHome');
    const navProfile = document.getElementById('navProfile');

    if (tab === 'feed') {
        if (feedView) feedView.classList.remove('hidden');
        if (profileView) profileView.classList.add('hidden');
        if (adBlock) adBlock.classList.remove('hidden');
        if (profileDetailsCard) profileDetailsCard.classList.add('hidden');
        if (navHome) navHome.classList.add('active');
        if (navProfile) navProfile.classList.remove('active');
        fetchPosts();
    } else if (tab === 'profile') {
        if (feedView) feedView.classList.add('hidden');
        if (profileView) profileView.classList.remove('hidden');
        if (adBlock) adBlock.classList.add('hidden');
        if (profileDetailsCard) profileDetailsCard.classList.remove('hidden');
        if (navHome) navHome.classList.remove('active');
        if (navProfile) navProfile.classList.add('active');
        renderProfile();
        fetchPortfolio();
    }
}

// --- ACTUALIZACIÓN DE UI Y PERFIL ---

function updateUserUI() {
    if (!currentUser) return;

    // Actualizar Avatares
    const avatarEls = document.querySelectorAll('.display-avatar');
    avatarEls.forEach(el => {
        if (currentUser.avatarImage) {
            el.innerHTML = `<img src="${currentUser.avatarImage}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            el.innerHTML = currentUser.avatar || currentUser.name.charAt(0).toUpperCase();
            el.style.backgroundColor = currentUser.avatarBg || '#2563eb';
        }
    });

    // Actualizar Textos de Perfil
    document.querySelectorAll('.display-name').forEach(el => el.innerText = currentUser.name);
    document.querySelectorAll('.display-profession').forEach(el => el.innerText = currentUser.profession || "Emprendedor");
    document.querySelectorAll('.display-bio').forEach(el => el.innerText = currentUser.bio || "");

    // Sidebar Details
    const profDetail = document.querySelector('.display-profession-detail');
    const tradeDetail = document.querySelector('.display-trade-detail');
    const expDetail = document.querySelector('.display-experience-detail');
    const locDetail = document.querySelector('.display-location-detail');

    if (profDetail) profDetail.innerText = currentUser.profession || "No especificado";
    if (tradeDetail) tradeDetail.innerText = currentUser.trade || "No especificado";
    if (expDetail) expDetail.innerText = `${currentUser.experience || 0} años`;
    if (locDetail) locDetail.innerText = currentUser.location || "No especificado";

    // Calificaciones
    updateRatingUI();
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateRatingUI() {
    const ratings = currentUser ? (currentUser.ratings || []) : [];
    const avg = ratings.length
        ? (ratings.reduce((a, b) => a + b.stars, 0) / ratings.length).toFixed(1)
        : "0.0";

    const scoreEl = document.querySelector(".display-score");
    const countEl = document.querySelector(".display-count");

    if (scoreEl) scoreEl.innerText = avg;
    if (countEl) {
        countEl.innerText = ratings.length
            ? `${ratings.length} calificación(es)`
            : "Sin calificaciones aún";
    }

    const starsWrapper = document.querySelector(".profile-stars-wrapper");
    if (starsWrapper) {
        const starIcons = starsWrapper.querySelectorAll(".star-icon");
        const numericAvg = parseFloat(avg);

        starIcons.forEach((star, idx) => {
            if (idx < Math.round(numericAvg)) {
                star.classList.add("active");
            } else {
                star.classList.remove("active");
            }
        });
    }
}

function previewAvatarImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        tempAvatarBase64 = evt.target.result;
        const img = document.getElementById('avatarImagePreview');
        if (img) {
            img.src = tempAvatarBase64;
            img.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function toggleEditForm() {
    const form = document.getElementById('editForm');
    if (!form) return;

    const isHidden = form.classList.contains('hidden');

    if (isHidden) {
        const nameInput = document.getElementById('editNameInput');
        const profInput = document.getElementById('editProfessionInput');
        const tradeInput = document.getElementById('editTradeInput');
        const expInput = document.getElementById('editExperienceInput');
        const locInput = document.getElementById('editLocationInput');
        const bioInput = document.getElementById('editBioInput');

        if (nameInput) nameInput.value = currentUser.name || '';
        if (profInput) profInput.value = currentUser.profession || '';
        if (tradeInput) tradeInput.value = currentUser.trade || '';
        if (expInput) expInput.value = currentUser.experience || 0;
        if (locInput) locInput.value = currentUser.location || '';
        if (bioInput) bioInput.value = currentUser.bio || '';
        
        tempAvatarBase64 = null;
        const imgPreview = document.getElementById('avatarImagePreview');
        if (imgPreview) {
            if (currentUser.avatarImage) {
                imgPreview.src = currentUser.avatarImage;
                imgPreview.style.display = 'block';
            } else {
                imgPreview.style.display = 'none';
            }
        }

        form.classList.remove('hidden');
    } else {
        form.classList.add('hidden');
    }
}

async function saveProfile() {
    const nameVal = document.getElementById('editNameInput')?.value.trim();
    const profVal = document.getElementById('editProfessionInput')?.value.trim();
    const tradeVal = document.getElementById('editTradeInput')?.value.trim();
    const expVal = document.getElementById('editExperienceInput')?.value;
    const locVal = document.getElementById('editLocationInput')?.value.trim();
    const bioVal = document.getElementById('editBioInput')?.value.trim();

    if (nameVal) currentUser.name = nameVal;
    if (profVal !== undefined) currentUser.profession = profVal;
    if (tradeVal !== undefined) currentUser.trade = tradeVal;
    if (expVal !== undefined) currentUser.experience = expVal;
    if (locVal !== undefined) currentUser.location = locVal;
    if (bioVal !== undefined) currentUser.bio = bioVal;

    if (tempAvatarBase64) {
        currentUser.avatarImage = tempAvatarBase64;
    }

    await syncUserData();
    toggleEditForm();
    updateUserUI();
}

async function syncUserData() {
    if (!currentUser || !currentUser.id) return;
    try {
        await db.collection('users').doc(currentUser.id).update(currentUser);
        localStorage.setItem('emprende_session', JSON.stringify(currentUser));
    } catch (error) {
        console.error("Error al actualizar usuario en Firestore:", error);
    }
}

function renderProfile() {
    updateUserUI();
}

// --- GESTIÓN DE IMÁGENES EN PUBLICACIONES ---

function previewPostImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        tempPostImageBase64 = evt.target.result;
        const imgPreview = document.getElementById('postImagePreview');
        const previewContainer = document.getElementById('postImagePreviewContainer');
        
        if (imgPreview && previewContainer) {
            imgPreview.src = tempPostImageBase64;
            previewContainer.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}

function removePostImagePreview() {
    tempPostImageBase64 = null;
    const imgInput = document.getElementById('postImageInput');
    const previewContainer = document.getElementById('postImagePreviewContainer');
    const imgPreview = document.getElementById('postImagePreview');
    
    if (imgInput) imgInput.value = '';
    if (imgPreview) imgPreview.src = '';
    if (previewContainer) previewContainer.classList.add('hidden');
}

// --- PUBLICACIÓN EN FEED Y PORTAFOLIO ---

async function addPost() {
    const postInput = document.getElementById('postInput');
    const postType = document.getElementById('postType');
    
    if (!postInput || !postType) return;

    const text = postInput.value.trim();
    const type = postType.value;

    if (!text && !tempPostImageBase64) return alert("Escribe un mensaje o sube una imagen para publicar.");

    const newPost = {
        authorId: currentUser.id,
        author: currentUser.name,
        authorProfession: currentUser.profession || "Emprendedor",
        authorAvatar: currentUser.avatar || currentUser.name.charAt(0),
        avatarBg: currentUser.avatarBg || "#2563eb",
        avatarImage: currentUser.avatarImage || null,
        time: "Hace un momento",
        type: type,
        content: text,
        image: tempPostImageBase64 || null,
        likes: 0,
        likesList: [],
        comments: 0,
        commentsList: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('posts').add(newPost);
        postInput.value = '';
        removePostImagePreview();
        fetchPosts();
    } catch (error) {
        alert("Error al publicar: " + error.message);
    }
}

function fetchPosts() {
    db.collection('posts').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderPosts();
    }, (error) => {
        console.error("Error al obtener publicaciones:", error);
    });
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        let tagClass = 'tag-duda';
        if (post.type === 'Idea') tagClass = 'tag-idea';
        if (post.type === 'Recomendacion') tagClass = 'tag-recomendacion';

        const avatarHTML = post.avatarImage 
            ? `<img src="${post.avatarImage}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : (post.authorAvatar || post.author.charAt(0));

        const isOwner = currentUser && post.authorId === currentUser.id;
        const comments = post.commentsList || [];

        // Validar si el usuario actual ya le dio Like
        const userLiked = currentUser && post.likesList && post.likesList.includes(currentUser.id);

        return `
            <div class="card post" id="post-${post.id}">
                <div class="post-header" style="position: relative;">
                    <div class="avatar" style="width: 40px; height: 40px; font-size: 1rem; margin: 0; background-color: ${post.avatarBg || '#2563eb'}; padding: 0; overflow: hidden;">
                        ${avatarHTML}
                    </div>
                    <div class="post-user-info">
                        <h4>${post.author}</h4>
                        <span>${post.authorProfession} • ${post.time || 'Reciente'}</span>
                    </div>
                    <span class="post-tag ${tagClass}">${post.type}</span>
                    
                    ${isOwner ? `
                        <div style="margin-left: auto; display: flex; gap: 8px;">
                            <button onclick="editPost('${post.id}')" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.8rem;">Editar</button>
                            <button onclick="deletePost('${post.id}')" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 0.8rem;">Eliminar</button>
                        </div>
                    ` : ''}
                </div>
                ${post.content ? `<div class="post-content" style="margin-top: 0.8rem;">${post.content}</div>` : ''}
                ${post.image ? `<div style="margin-top: 0.5rem; border-radius: 8px; overflow: hidden;"><img src="${post.image}" alt="Imagen de publicación" style="width: 100%; max-height: 400px; object-fit: cover;"></div>` : ''}
                
                <div class="post-footer" style="margin-top: 0.8rem; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 0.5rem; display: flex; gap: 15px;">
                    <div class="interaction-btn ${userLiked ? 'active-like' : ''}" onclick="likePost('${post.id}')" style="cursor: pointer; display: flex; align-items: center; gap: 5px; color: ${userLiked ? 'var(--accent, #2563eb)' : 'inherit'}; font-weight: ${userLiked ? '600' : 'normal'};">
                        <i data-lucide="thumbs-up" size="16"></i> ${post.likesList ? post.likesList.length : (post.likes || 0)}
                    </div>
                    <div class="interaction-btn" onclick="toggleComments('${post.id}')" style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i data-lucide="message-square" size="16"></i> ${post.comments || comments.length}
                    </div>
                </div>

                <!-- Sección de Comentarios -->
                <div id="comments-section-${post.id}" class="comments-section hidden" style="margin-top: 1rem; background-color: rgba(0,0,0,0.02); padding: 0.8rem; border-radius: 8px;">
                    <div class="comments-list" style="margin-bottom: 0.8rem;">
                        ${comments.map(c => `
                            <div style="font-size: 0.85rem; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 0.3rem;">
                                <strong>${c.author}:</strong>${c.content}
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="comment-input-${post.id}" placeholder="Escribe un comentario..." style="flex: 1; padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;">
                        <button onclick="addComment('${post.id}')" style="padding: 0.4rem 0.8rem; background-color: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Enviar</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// --- EDICIÓN Y ELIMINACIÓN DE PUBLICACIONES ---

async function deletePost(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta publicación?")) {
        try {
            await db.collection('posts').doc(id).delete();
        } catch (error) {
            alert("Error al eliminar la publicación: " + error.message);
        }
    }
}

async function editPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const newText = prompt("Edita tu publicación:", post.content);
    if (newText !== null && newText.trim() !== "") {
        try {
            await db.collection('posts').doc(id).update({
                content: newText.trim()
            });
        } catch (error) {
            alert("Error al actualizar publicación: " + error.message);
        }
    }
}

// --- COMENTARIOS EN PUBLICACIONES ---

function toggleComments(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    if (section) {
        section.classList.toggle('hidden');
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === postId);
    if (post) {
        const commentsList = post.commentsList || [];
        commentsList.push({
            id: Date.now(),
            author: currentUser ? currentUser.name : "Usuario",
            content: text,
            time: "Hace un momento"
        });

        try {
            await db.collection('posts').doc(postId).update({
                commentsList: commentsList,
                comments: commentsList.length
            });
            input.value = '';
        } catch (error) {
            alert("Error al añadir comentario: " + error.message);
        }
    }
}

async function likePost(id) {
    if (!currentUser) return alert("Debes iniciar sesión para dar me gusta.");

    const post = posts.find(p => p.id === id);
    if (!post) return;

    const likesList = post.likesList || [];
    const userIndex = likesList.indexOf(currentUser.id);

    if (userIndex === -1) {
        likesList.push(currentUser.id);
    } else {
        likesList.splice(userIndex, 1);
    }

    try {
        await db.collection('posts').doc(id).update({
            likesList: likesList,
            likes: likesList.length
        });
    } catch (error) {
        console.error("Error al actualizar me gusta:", error);
    }
}

// Portafolio / Trabajos
function previewWorkImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        tempImageBase64 = evt.target.result;
        const img = document.getElementById('workImagePreview');
        if (img) {
            img.src = tempImageBase64;
            img.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

async function addWork(category) {
    const workInput = document.getElementById('workInput');
    const text = workInput ? workInput.value.trim() : '';

    if (!text && !tempImageBase64) return alert("Añade una descripción o una imagen.");

    const item = {
        userId: currentUser.id,
        category: category,
        text: text,
        image: tempImageBase64 || null,
        date: new Date().toLocaleDateString(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('portfolio').add(item);

        if (workInput) workInput.value = '';
        const imgPreview = document.getElementById('workImagePreview');
        const imgInput = document.getElementById('workImageInput');
        if (imgPreview) imgPreview.style.display = 'none';
        if (imgInput) imgInput.value = '';
        tempImageBase64 = null;

        fetchPortfolio();
    } catch (error) {
        alert("Error al añadir trabajo al portafolio: " + error.message);
    }
}

function fetchPortfolio() {
    if (!currentUser) return;
    db.collection('portfolio')
        .where('userId', '==', currentUser.id)
        .onSnapshot((snapshot) => {
            portfolioItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderPortfolio();
        }, (error) => {
            console.error("Error al obtener portafolio:", error);
        });
}

function renderPortfolio() {
    const container = document.getElementById('portfolioContainer');
    if (!container) return;

    if (portfolioItems.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">Aún no has compartido trabajos realizados ni solicitudes.</p>`;
        return;
    }

    container.innerHTML = portfolioItems.map(item => `
        <div class="card portfolio-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span class="post-tag ${item.category === 'trabajo' ? 'tag-trabajo' : 'tag-recomendacion'}">
                    ${item.category === 'trabajo' ? 'Trabajo Realizado' : 'Solicitud de Recomendación'}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${item.date}</span>
            </div>
            ${item.text ? `<p class="post-content" style="font-size: 0.9rem;">${item.text}</p>` : ''}
            ${item.image ? `<img src="${item.image}" alt="Trabajo" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px; margin-top:0.5rem;">` : ''}
        </div>
    `).join('');
}

// --- SISTEMA DE CALIFICACIÓN (MODAL) ---

function openRatingModal() {
    selectedRatingStars = 0;
    const commentEl = document.getElementById('ratingComment');
    const modalEl = document.getElementById('ratingModal');

    if (commentEl) commentEl.value = '';
    updateModalStars(0);
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeRatingModal() {
    const modalEl = document.getElementById('ratingModal');
    if (modalEl) modalEl.classList.add('hidden');
}

function setRating(stars) {
    selectedRatingStars = stars;
    updateModalStars(stars);
}

function updateModalStars(stars) {
    const container = document.getElementById('modalStars');
    if (!container) return;

    const starIcons = container.querySelectorAll('i');
    starIcons.forEach((icon, idx) => {
        if (idx < stars) {
            icon.classList.add('hovered');
        } else {
            icon.classList.remove('hovered');
        }
    });
}

async function submitRating() {
    if (selectedRatingStars === 0) return alert("Por favor selecciona una cantidad de estrellas.");

    const commentEl = document.getElementById('ratingComment');
    const comment = commentEl ? commentEl.value.trim() : '';

    currentUser.ratings = currentUser.ratings || [];
    currentUser.ratings.push({
        from: "Usuario Anónimo",
        stars: selectedRatingStars,
        comment: comment,
        date: new Date().toLocaleDateString()
    });

    await syncUserData();
    updateUserUI();
    closeRatingModal();
}
