const firebaseConfig = {
    apiKey: "AIzaSyBmsI3pYbyWD9EPQIAOteFMGed3Xk7kev8",
    authDomain: "pandahubsite.firebaseapp.com",
    databaseURL: "https://pandahubsite-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pandahubsite",
    storageBucket: "pandahubsite.firebasestorage.app",
    messagingSenderId: "819448675458",
    appId: "1:819448675458:web:6abe7626c1601b66a7489b",
    measurementId: "G-PGX37QWT2L"
};

let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (e) {
    console.error("Firebase başlatılamadı (Ana sayfa):", e);
}

const ADMIN_PASSWORD = "Panda";

document.addEventListener('DOMContentLoaded', () => {
    /* --- Admin Secret Login Logic --- */
    let logoClicks = 0;
    let clickTimer;
    const logoEl = document.querySelector('.logo');
    const loginModal = document.getElementById('secret-login-modal');
    const loginBtn = document.getElementById('login-btn');
    const closeBtn = document.getElementById('close-login-btn');
    const passInput = document.getElementById('admin-pass');
    const errorMsg = document.getElementById('login-error');
    const adminNav = document.getElementById('nav-admin');
    const adminSection = document.getElementById('admin');

    // Check if already logged in via localStorage
    if (localStorage.getItem('admin_logged') === 'true') {
        adminNav.style.display = 'flex';
        initAdminPanel();
    }

    if (logoEl) {
        logoEl.addEventListener('click', (e) => {
            e.preventDefault();
            logoClicks++;
            clearTimeout(clickTimer);

            if (logoClicks >= 3) {
                if (localStorage.getItem('admin_logged') !== 'true') {
                    loginModal.style.display = 'flex';
                } else {
                    adminNav.style.display = 'flex';
                }
                logoClicks = 0;
            } else {
                clickTimer = setTimeout(() => {
                    logoClicks = 0;
                }, 1000); // Reset after 1 second
            }
        });
    }

    closeBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        passInput.value = '';
        errorMsg.innerText = '';
    });

    loginBtn.addEventListener('click', attemptLogin);
    passInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    function attemptLogin() {
        if (passInput.value === ADMIN_PASSWORD) {
            localStorage.setItem('admin_logged', 'true');
            loginModal.style.display = 'none';
            adminNav.style.display = 'flex';
            initAdminPanel();
        } else {
            errorMsg.innerText = "Incorrect Password!";
        }
    }

    // Smooth scroll for nav admin
    adminNav.addEventListener('click', (e) => {
        e.preventDefault();
        adminSection.style.display = 'block';
        window.scrollTo({
            top: adminSection.offsetTop - 80,
            behavior: 'smooth'
        });
    });

    /* --- Admin Panel Logic --- */
    function initAdminPanel() {
        if (!database) return;

        loadAdminScripts();

        const form = document.getElementById('add-script-form');
        const msgEl = document.getElementById('form-msg');
        const submitBtn = document.getElementById('submit-script-btn');

        if (form && !form.dataset.initialized) {
            form.dataset.initialized = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
                submitBtn.disabled = true;

                const title = document.getElementById('script-title').value;
                const loadstring = document.getElementById('script-loadstring').value;

                // Optional Fields
                const descVal = document.getElementById('script-desc').value;
                const desc = descVal.trim() !== '' ? descVal : "No description provided.";

                const tagsVal = document.getElementById('script-tags').value;
                const tags = tagsVal.trim() !== '' ? tagsVal.split(',').map(s => s.trim()) : ["Script"];

                const gameUrl = document.getElementById('script-game-url').value;
                let imgUrl = document.getElementById('script-img').value;

                if (!imgUrl && gameUrl) {
                    const placeIdMatch = gameUrl.match(/games\/(\d+)/);
                    if (placeIdMatch && placeIdMatch[1]) {
                        const placeId = placeIdMatch[1];
                        try {
                            const proxyUrl = `https://thumbnails.roproxy.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
                            const res = await fetch(proxyUrl);
                            const data = await res.json();

                            if (data && data.data && data.data.length > 0) {
                                imgUrl = data.data[0].imageUrl;
                            }
                        } catch (err) {
                            console.log("Roblox resim çekme hatası:", err);
                        }
                    }
                }

                const newScriptRef = firebase.database().ref('scripts').push();
                newScriptRef.set({
                    title: title,
                    desc: desc,
                    tags: tags,
                    loadstring: loadstring,
                    imageUrl: imgUrl || "",
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    msgEl.innerText = "Script başarıyla paylaşıldı!";
                    msgEl.className = "msg success";
                    form.reset();
                }).catch((err) => {
                    msgEl.innerText = "Hata: " + err.message;
                    msgEl.className = "msg error";
                }).finally(() => {
                    submitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Publish Script';
                    submitBtn.disabled = false;
                });
            });
        }
    }

    function loadAdminScripts() {
        const scriptsRef = database.ref('scripts');
        scriptsRef.on('value', (snapshot) => {
            const listDiv = document.getElementById('admin-scripts-list');
            if (!listDiv) return;

            listDiv.innerHTML = '';
            const scripts = snapshot.val();

            if (!scripts) {
                listDiv.innerHTML = '<p class="loading-text">Veritabanında henüz script yok.</p>';
                return;
            }

            const scriptsArray = Object.keys(scripts).map(key => ({ id: key, ...scripts[key] })).sort((a, b) => b.timestamp - a.timestamp);

            scriptsArray.forEach(script => {
                const item = document.createElement('div');
                item.className = 'admin-script-item';
                item.innerHTML = `
                    <div>
                        <h4>${script.title}</h4>
                        <p>${script.tags.join(', ')}</p>
                    </div>
                    <button class="btn-delete" data-id="${script.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
                listDiv.appendChild(item);
            });

            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm("Bu script'i silmek istediğinize emin misiniz?")) {
                        database.ref('scripts/' + id).remove();
                    }
                });
            });
        });
    }

    /* --- Navbar Scroll Effect --- */
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* --- Intersection Observer for Scroll Animations --- */
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show-anim');

                // If the element has counter animation inside
                const counters = entry.target.querySelectorAll('.counter');
                counters.forEach(counter => animateCounter(counter));

                observer.unobserve(entry.target); // Run once
            }
        });
    }, observerOptions);

    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach(el => observer.observe(el));

    /* --- Counter Animation --- */
    function animateCounter(counter) {
        const target = +counter.getAttribute('data-target');
        const duration = 2000; // ms

        if (target === 0) {
            counter.innerText = "0";
            return;
        }

        const increment = Math.max(1, target / (duration / 16));
        let current = 0;

        if (counter.animId) cancelAnimationFrame(counter.animId);

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current) + (target > 50 ? '+' : '');
                counter.animId = requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target + (target > 50 ? '+' : '');
            }
        };
        updateCounter();
    }

    /* --- Live User Counter --- */
    if (database) {
        // Firebase Presence System
        const connectedRef = database.ref('.info/connected');
        const activeUsersRef = database.ref('active_users');
        const liveUserCountEl = document.getElementById('live-user-count');
        let myConnectionsRef = null;

        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Rastgele id
                myConnectionsRef = activeUsersRef.push();
                myConnectionsRef.onDisconnect().remove();
                myConnectionsRef.set(true);
            }
        });

        // Ekranda goster
        activeUsersRef.on('value', (snap) => {
            const users = snap.val();
            const count = users ? Object.keys(users).length : 0;
            if (liveUserCountEl) {
                liveUserCountEl.innerText = count;
            }

            const statOnline = document.getElementById('stat-online-users');
            if (statOnline) {
                statOnline.setAttribute('data-target', count);
                if (statOnline.closest('section').classList.contains('show-anim')) animateCounter(statOnline);
            }
        });

        // Site Views Counter
        const viewsRef = database.ref('site_views');
        if (!sessionStorage.getItem('visited')) {
            viewsRef.transaction((currentViews) => {
                return (currentViews || 0) + 1;
            });
            sessionStorage.setItem('visited', 'true');
        }

        viewsRef.on('value', (snap) => {
            const views = snap.val() || 0;
            const statViews = document.getElementById('stat-happy-users');
            if (statViews) {
                statViews.setAttribute('data-target', views);
                if (statViews.closest('section').classList.contains('show-anim')) animateCounter(statViews);
            }
        });
    }

    /* --- Dynamic Scripts Loading --- */
    if (database) {
        const scriptsRef = database.ref('scripts');
        const scriptsGrid = document.getElementById('scripts-grid');

        scriptsRef.on('value', (snapshot) => {
            if (!scriptsGrid) return;
            scriptsGrid.innerHTML = ''; // Clear loading text

            const scripts = snapshot.val();
            const scriptCount = scripts ? Object.keys(scripts).length : 0;

            const statScripts = document.getElementById('stat-scripts-made');
            if (statScripts) {
                statScripts.setAttribute('data-target', scriptCount);
                if (statScripts.closest('section').classList.contains('show-anim')) animateCounter(statScripts);
            }

            if (!scripts) {
                scriptsGrid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Henüz script eklenmemiş.</p>';
                return;
            }

            // Objeyi arraye çevir ve timestamp'e göre sırala (en yeni en üstte)
            const scriptsArray = Object.keys(scripts).map(key => scripts[key]).sort((a, b) => b.timestamp - a.timestamp);

            scriptsArray.forEach((script, idx) => {
                // Varsayılan resim
                const imgSrc = script.imageUrl ? script.imageUrl : 'https://tr.rbxcdn.com/f0449cefa72763ccc6d893fcc25eb5f3/512/512/Image/Png'; // Varsayılan roblux iconu veya başka bişey

                // HTML Kartı Onluştur
                const card = document.createElement('div');
                card.className = 'script-card show-anim'; // animasyonu direkt veriyoruz cunku dinamik yukleniyor
                card.style.opacity = 0;

                card.innerHTML = `
                    <div class="script-card-image" style="background: url('${imgSrc}') center/cover; position: relative;">
                        <!-- Overlay for dim effect -->
                        <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, rgba(46, 204, 113, 0.4), rgba(0, 0, 0, 0.8));"></div>
                        <div class="icon-wrapper" style="position: relative; z-index: 2; margin-top: 30px;"><i class="fa-solid fa-code"></i></div>
                    </div>
                    <div class="script-card-content">
                        <h3>${script.title}</h3>
                        <p>${script.desc}</p>
                        <div class="script-tags">
                            ${script.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="script-card-footer">
                        <button class="btn-copy dynamic-copy" data-script="${script.loadstring.replace(/"/g, '&quot;')}">
                            <i class="fa-solid fa-copy"></i> Copy Loadstring
                        </button>
                    </div>
                `;

                scriptsGrid.appendChild(card);

                // Opacity gecikmesi ile gelisi
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                    card.style.opacity = 1;
                }, idx * 100);
            });
        });
    }

    /* --- Event Delegation for Dynamic Copy Buttons --- */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.dynamic-copy');
        if (btn) {
            const scriptContent = btn.getAttribute('data-script');

            navigator.clipboard.writeText(scriptContent).then(() => {
                showToast();

                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.background = '#27ae60';
                btn.style.color = '#fff';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    });

    /* --- Legacy Copy to Clipboard functionality (for static text if any) --- */
    const copyButtons = document.querySelectorAll('.btn-copy:not(.dynamic-copy)');
    const toast = document.getElementById('toast');
    let toastTimeout;

    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const scriptContent = btn.getAttribute('data-script');

            navigator.clipboard.writeText(scriptContent).then(() => {
                showToast();

                // Button effect
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.background = '#27ae60';
                btn.style.color = '#fff';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    });

    function showToast() {
        toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
