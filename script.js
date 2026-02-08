let state = { events: [], workers: [], catalog: {}, settings: { shopName: 'ডেকোর মাস্টার প্রো', shopAddress: 'Dhaka', shopPhone: '01700000000' } };
let cart = {}; 
let currentModalItem = null; 
let activeBookingCat = ''; 
let tempEventIdForWarning = null; 
let activeEventId = null;
let currentCalDate = new Date();
let tempItemPhoto = null;

let bookingData = { name: '', phone: '', phones: [], date: '', endDate: '', loc: '', status: 'চালু', note: '' };
let lastSavedEvent = null;
let eventListFilter = { search: '', from: '', to: '' };

const defaultCatalog = { 
    "আসবাবপত্র": { icon: 'fa-chair', color: 'text-orange-600', items: [{name: 'চেয়ার', price: 10, photo: ''}, {name: 'টেবিল কাঠ', price: 100, photo: ''}, {name: 'টেবিল প্লাস্টিক', price: 50, photo: ''}] }, 
    "বাসনপত্র": { icon: 'fa-utensils', color: 'text-gray-600', items: [{name: 'প্লেট', price: 5, photo: ''}, {name: 'গ্লাস', price: 5, photo: ''}, {name: 'ভাতের বোল', price: 15, photo: ''}, {name: 'তরকারি বাটি', price: 10, photo: ''}, {name: 'তরকারি চামচ', price: 10, photo: ''}, {name: 'ডেগ', price: 150, photo: ''}] },
    "ইলেকট্রনিক্স": { icon: 'fa-bolt', color: 'text-yellow-600', items: [{name: 'স্ট্যান্ড ফ্যান', price: 500, photo: ''}, {name: 'জেনারেটর', price: 2000, photo: ''}, {name: 'IPS', price: 2000, photo: ''}, {name: 'ব্যাটারি', price: 500, photo: ''}] },
    "ডেকোরেশন": { icon: 'fa-palette', color: 'text-purple-600', items: [{name: 'গেইট', type: 'gate'}, {name: 'চান্দিনা (১৫/২০ হাত)', price: 500, photo: ''}, {name: 'সাইট ফরদা', price: 200, photo: ''}, {name: 'ফুলের গেইট', price: 2000, photo: ''}, {name: 'পারগান', price: 500, photo: ''}, {name: 'কার্পেট প্যান্ডেল (১৫/২০)', price: 1500, photo: ''}, {name: 'কার্পেট', price: 500, photo: ''}, {name: 'মরিচ বাতি (হাত)', price: 50, photo: ''}] },
    "সাউন্ড সিস্টেম": { icon: 'fa-music', color: 'text-blue-500', items: [{name: 'বক্স ১৮ ইঞ্চি', price: 1000, photo: ''}, {name: 'বক্স ১৫ ইঞ্চি', price: 800, photo: ''}, {name: 'মাইক', price: 200, photo: ''}, {name: 'মনিটর', price: 500, photo: ''}] },
    "গায়ে হলুদ": { icon: 'fa-heart', color: 'text-pink-600', items: [{name: 'গায়ে হলুদ শাড়ি', price: 50, photo: ''}, {name: 'গায়ে হলুদ পাঞ্জাবি', price: 50, photo: ''}, {name: 'গায়ে হলুদের ডিজাইন', price: 2000, photo: ''}] },
    "অন্যান্য": { icon: 'fa-box-open', color: 'text-teal-600', items: [{name: 'পানির ড্রাম', price: 100, photo: ''}, {name: 'পানির ফিল্টার', price: 100, photo: ''}] }
};

const bengaliDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

// Auth Functions
function showRegister() {
    document.getElementById('auth-form').classList.add('hide');
    document.getElementById('register-form').classList.remove('hide');
}

function showLogin() {
    document.getElementById('register-form').classList.add('hide');
    document.getElementById('auth-form').classList.remove('hide');
}

function login() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .catch(error => alert("লগইন ব্যর্থ: " + error.message));
}

function register() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const shopName = document.getElementById('reg-name').value;
    
    if(!shopName) return alert("দোকানের নাম দিন");
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(cred => {
            const userData = {
                settings: {
                    shopName: shopName,
                    shopAddress: 'ঠিকানা যোগ করুন',
                    shopPhone: 'ফোন নম্বর যোগ করুন'
                },
                catalog: defaultCatalog,
                createdAt: Date.now()
            };
            return db.ref('users/' + cred.user.uid).set(userData);
        })
        .catch(error => alert("রেজিস্ট্রেশন ব্যর্থ: " + error.message));
}

function logout() {
    firebase.auth().signOut();
    location.reload();
}

function toggleUserMenu() {
    document.getElementById('user-menu').classList.toggle('hide');
}

window.onload = function() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userId = user.uid;
            document.getElementById('auth-modal').classList.add('hide');
            document.getElementById('user-email').innerText = user.email;
            loadUserData();
        } else {
            document.getElementById('auth-modal').classList.remove('hide');
        }
    });
    
    window.addEventListener('online', updateConn); 
    window.addEventListener('offline', updateConn); 
    updateConn();
};

function loadUserData() {
    if(!userId) return;
    
    db.ref('users/' + userId).on('value', snap => {
        if(snap.exists()) {
            const d = snap.val();
            state.catalog = d.catalog || defaultCatalog;
            state.settings = d.settings || state.settings;
            document.getElementById('user-shop').innerText = state.settings.shopName;
            saveLocal();
        } else {
            state.catalog = defaultCatalog;
            db.ref('users/' + userId).set({
                settings: state.settings,
                catalog: defaultCatalog,
                createdAt: Date.now()
            });
        }
        
        db.ref('events/' + userId).on('value', eventSnap => {
            state.events = eventSnap.exists() ? Object.values(eventSnap.val()) : [];
            if(!Array.isArray(state.events)) state.events = [];
            saveLocal();
            updateNotifications();
            const cats = Object.keys(state.catalog); 
            if(cats.length > 0) activeBookingCat = cats[0];
            router('dashboard');
        });
        
        db.ref('workers/' + userId).on('value', workerSnap => {
            state.workers = workerSnap.exists() ? Object.values(workerSnap.val()) : [];
            saveLocal();
        });
    });
}

function saveLocal() { 
    if(!userId) return;
    localStorage.setItem('dm_catalog_' + userId, JSON.stringify(state.catalog)); 
    localStorage.setItem('dm_events_' + userId, JSON.stringify(state.events)); 
    localStorage.setItem('dm_workers_' + userId, JSON.stringify(state.workers)); 
    localStorage.setItem('dm_settings_' + userId, JSON.stringify(state.settings)); 
    updateNotifications(); 
}

function updateConn() { 
    isOnline = navigator.onLine; 
    document.getElementById('conn-text').innerText = isOnline?"অনলাইন":"অফলাইন"; 
    document.getElementById('conn-dot').className = isOnline?"w-2 h-2 rounded-full bg-green-500 animate-pulse":"w-2 h-2 rounded-full bg-red-500"; 
    if(isOnline) manualSync(); 
}

function saveData(type, data) { 
    if(!userId) return;
    saveLocal();
    if(isOnline && db) {
        if(type === 'events' || type === 'workers') {
            const obj = {};
            data.forEach((item) => {
                if(item.id) obj[item.id] = item;
            });
            db.ref(type + '/' + userId).set(obj);
        } else {
            db.ref('users/' + userId + '/' + type).set(data);
        }
    }
    updateNotifications(); 
}

function manualSync() { 
    if(isOnline && db && userId) {
        document.getElementById('sync-icon').classList.add('fa-spin');
        db.ref('users/' + userId).get().then(snap => {
            if(snap.exists()) {
                const d = snap.val();
                state.catalog = d.catalog || defaultCatalog;
                state.settings = d.settings || state.settings;
            }
        });
        db.ref('events/' + userId).get().then(snap => {
            if(snap.exists()) {
                state.events = Object.values(snap.val());
            }
        });
        db.ref('workers/' + userId).get().then(snap => {
            if(snap.exists()) {
                state.workers = Object.values(snap.val());
            }
            setTimeout(() => {
                document.getElementById('sync-icon').classList.remove('fa-spin');
                saveLocal();
                updateUI();
            }, 1000);
        });
    }
}

function updateUI() { if(activeEventId) viewEvent(activeEventId); else { const c = document.querySelector('.nav-btn.text-secondary'); if(c) router(c.id.replace('nav-', '')); } }

function router(page) {
    if(page !== 'booking') {
        activeEventId = null;
        cart = {};
        bookingData = { name: '', phone: '', phones: [], date: '', endDate: '', loc: '', status: 'চালু', note: '' };
    }
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('text-secondary', 'text-primary'));
    const targetBtn = document.getElementById('nav-'+ (['dashboard','calendar','booking','workers','settings'].includes(page) ? page : 'settings'));
    if(targetBtn) targetBtn.classList.add('text-secondary');

    const app = document.getElementById('app');
    if(page === 'dashboard') renderDashboard(app);
    else if(page === 'booking') renderBooking(app);
    else if(page === 'calendar') renderCalendar(app);
    else if(page === 'workers') renderWorkers(app);
    else if(page === 'settings') renderSettings(app);
    else if(page === 'all-events') renderAllEvents(app);
}

function getBengaliDayName(dateStr) {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return bengaliDays[date.getDay()];
}

function formatDateWithDay(dateStr) {
    if(!dateStr) return '';
    return `${dateStr} (${getBengaliDayName(dateStr)})`;
}

function isDateOverdue(dateStr) {
    if(!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(dateStr);
    return checkDate < today;
}

function isDateToday(dateStr) {
    if(!dateStr) return false;
    const today = new Date();
    const checkDate = new Date(dateStr);
    return today.toDateString() === checkDate.toDateString();
}

function getDaysOverdue(dateStr) {
    if(!dateStr) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(dateStr);
    if(checkDate >= today) return 0;
    const diffTime = Math.abs(today - checkDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

// --- DASHBOARD ---
function renderDashboard(c) {
    const due = state.events.reduce((s,e) => s + (e.due||0), 0);
    const active = state.events.filter(e => e.status !== 'সম্পন্ন' && e.status !== 'বাতিল').length;
    
    c.innerHTML = `
    <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white p-5 rounded-2xl shadow-card border border-slate-50">
            <p class="text-xs text-gray-500 font-bold mb-1">মোট বকেয়া</p>
            <h2 class="text-2xl font-bold text-danger">৳${due}</h2>
        </div>
        <div class="bg-white p-5 rounded-2xl shadow-card border border-slate-50">
            <p class="text-xs text-gray-500 font-bold mb-1">চলমান ইভেন্ট</p>
            <h2 class="text-2xl font-bold text-primary">${active}</h2>
        </div>
    </div>
    
    <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg text-primary">সাম্প্রতিক ইভেন্ট</h3>
        <button onclick="router('all-events')" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow active:scale-95 transition flex items-center gap-1">
            <i class="fas fa-list"></i> সব ইভেন্ট দেখুন
        </button>
    </div>
    
    <div class="space-y-3 pb-24">
        ${state.events.slice().reverse().slice(0,10).map(e=>{
            const isOverdue = isDateOverdue(e.endDate);
            const isToday = isDateToday(e.endDate);
            const daysOverdue = getDaysOverdue(e.endDate);
            const dateColorClass = isOverdue ? 'text-red-600 font-bold' : (isToday ? 'text-green-600 font-bold' : 'text-gray-500');
            const dateIcon = isOverdue ? '<i class="fas fa-exclamation-circle text-red-500 mr-1"></i>' : (isToday ? '<i class="fas fa-check-circle text-green-500 mr-1"></i>' : '');
            const overdueText = isOverdue ? ` <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">(${daysOverdue} দিন অতিক্রান্ত)</span>` : '';
            
            return `<div class="bg-white p-4 rounded-xl shadow-card border-l-4 ${e.status==='সম্পন্ন'?'border-green-500':(e.status==='বাতিল'?'border-red-500':'border-secondary')}">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <h4 class="font-bold text-slate-800">${e.client}</h4>
                        <div class="flex gap-2 mt-1">
                            <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-gray-600">${e.status||'চালু'}</span>
                            ${e.missingItems?'<span class="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">⚠️ Missing</span>':''}
                        </div>
                        <p class="text-xs text-gray-500 mt-1">শুরু: ${formatDateWithDay(e.date)}</p>
                        ${e.endDate?`<p class="text-xs ${dateColorClass} mt-1">${dateIcon}ফেরত: ${formatDateWithDay(e.endDate)}${overdueText}</p>`:''}
                        ${e.note?`<p class="text-xs text-orange-500 mt-1"><i class="fas fa-sticky-note mr-1"></i>${e.note.substring(0, 30)}${e.note.length>30?'...':''}</p>`:''}
                    </div>
                    <div class="text-right">
                        <span class="block font-bold text-primary">৳${e.finalTotal || e.total}</span>
                        <span class="text-[10px] ${e.due>0?'text-red-500':'text-green-500'}">${e.due>0?'বাকি: '+e.due:'পরিশোধিত'}</span>
                    </div>
                </div>
                <button onclick="viewEvent('${e.id}')" class="w-full py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition">বিস্তারিত দেখুন</button>
            </div>`;
        }).join('')}
    </div>`;
}

// --- ALL EVENTS LIST ---
function renderAllEvents(c) {
    const filtered = state.events.filter(e => {
        const searchMatch = !eventListFilter.search || 
            e.client.toLowerCase().includes(eventListFilter.search.toLowerCase()) ||
            e.phone.includes(eventListFilter.search) ||
            (e.phones && e.phones.some(p => p.includes(eventListFilter.search)));
        const dateMatch = (!eventListFilter.from || e.date >= eventListFilter.from) && 
                        (!eventListFilter.to || e.date <= eventListFilter.to);
        return searchMatch && dateMatch;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));

    c.innerHTML = `
    <div class="bg-white p-5 rounded-2xl shadow-card mb-24">
        <div class="flex items-center gap-3 mb-6 border-b pb-4">
            <button onclick="router('dashboard')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-gray-600 hover:bg-slate-200 transition">
                <i class="fas fa-arrow-left"></i>
            </button>
            <h2 class="font-bold text-xl text-primary">সকল বুকিং এর তালিকা</h2>
        </div>
        
        <div class="space-y-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex gap-2">
                <input type="text" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..." 
                       value="${eventListFilter.search}" 
                       oninput="eventListFilter.search=this.value; renderAllEvents(document.getElementById('app'))" 
                       class="flex-1 bg-white border p-3 rounded-lg text-sm">
                <button onclick="eventListFilter.search=''; eventListFilter.from=''; eventListFilter.to=''; renderAllEvents(document.getElementById('app'))" class="bg-gray-200 text-gray-600 px-3 rounded-lg text-xs font-bold">
                    <i class="fas fa-times"></i> ক্লিয়ার
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="date" placeholder="তারিখ থেকে" 
                       value="${eventListFilter.from}" 
                       onchange="eventListFilter.from=this.value; renderAllEvents(document.getElementById('app'))" 
                       class="w-full bg-white border p-2 rounded-lg text-xs">
                <input type="date" placeholder="তারিখ পর্যন্ত" 
                       value="${eventListFilter.to}" 
                       onchange="eventListFilter.to=this.value; renderAllEvents(document.getElementById('app'))" 
                       class="w-full bg-white border p-2 rounded-lg text-xs">
            </div>
        </div>

        <div class="space-y-3">
            ${filtered.length === 0 ? '<p class="text-center text-gray-400 py-8">কোন বুকিং পাওয়া যায়নি</p>' : ''}
            ${filtered.map((e, idx) => {
                const isOverdue = isDateOverdue(e.endDate);
                const isToday = isDateToday(e.endDate);
                const daysOverdue = getDaysOverdue(e.endDate);
                const dateColorClass = isOverdue ? 'text-red-600' : (isToday ? 'text-green-600' : 'text-gray-500');
                const dateBgClass = isOverdue ? 'bg-red-50' : (isToday ? 'bg-green-50' : 'bg-white');
                
                return `<div class="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer" onclick="viewEvent('${e.id}')">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">#${idx + 1}</span>
                                <h4 class="font-bold text-slate-800">${e.client}</h4>
                            </div>
                            <p class="text-xs text-gray-500 mt-1"><i class="fas fa-phone text-[10px] mr-1"></i>${e.phone || 'N/A'} | <i class="fas fa-calendar text-[10px] mr-1"></i>${formatDateWithDay(e.date)}</p>
                            ${e.endDate?`<p class="text-xs ${dateColorClass} font-bold mt-1 px-2 py-0.5 rounded ${dateBgClass} inline-block">
                                <i class="fas fa-undo text-[10px] mr-1"></i>ফেরত: ${formatDateWithDay(e.endDate)} 
                                ${isOverdue?`(${daysOverdue} দিন অতিক্রান্ত)`:(isToday?'(আজ)':'')}
                            </p>`:''}
                            ${e.note?`<p class="text-xs text-orange-500 mt-1"><i class="fas fa-sticky-note mr-1"></i>${e.note.substring(0, 25)}${e.note.length>25?'...':''}</p>`:''}
                        </div>
                        <span class="text-[10px] px-2 py-1 rounded border ${e.status === 'সম্পন্ন' ? 'bg-green-50 text-green-600 border-green-200' : (e.status === 'বাতিল' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200')}">${e.status}</span>
                    </div>
                    <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-2">
                        <span class="text-xs text-gray-500">মোট: <b class="text-slate-700">৳${e.finalTotal || e.total}</b></span>
                        <span class="text-xs ${e.due > 0 ? 'text-red-500' : 'text-green-500'}">${e.due > 0 ? 'বাকি: ৳'+e.due : 'পরিশোধিত'}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
        <div class="mt-4 text-center text-xs text-gray-400">মোট ${filtered.length} টি বুকিং</div>
    </div>`;
}

// --- BOOKING SYSTEM ---
function renderBooking(c) {
    const cats = Object.keys(state.catalog);
    if(cats.length === 0) { c.innerHTML = '<div class="p-10 text-center text-gray-400">কোন ক্যাটাগরি নেই।</div>'; return; }
    if(!activeBookingCat || !state.catalog[activeBookingCat]) activeBookingCat = cats[0];

    let catHtml = `<div class="flex overflow-x-auto gap-3 py-2 px-1 cat-scroll snap-x">`;
    cats.forEach(k => {
        const cat = state.catalog[k];
        const isActive = k === activeBookingCat;
        const hasSelected = cat.items.some(i => {
            if (i.type === 'gate') return Object.keys(cart).some(key => key.includes('গেইট'));
            return cart[i.name];
        });
        catHtml += `<div onclick="setActiveCat('${k}')" class="snap-start flex-shrink-0 flex flex-col items-center justify-center p-3 w-20 h-20 rounded-xl border ${isActive ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'} shadow-sm transition active:scale-95 cursor-pointer relative">${hasSelected ? '<span class="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>' : ''}<i class="fas ${cat.icon} text-xl ${cat.color} mb-1"></i><span class="text-[10px] font-bold text-center leading-tight truncate w-full">${k}</span></div>`;
    });
    catHtml += `</div>`;

    const items = state.catalog[activeBookingCat].items;
    let itemsHtml = `<div class="grid grid-cols-3 gap-2 mt-2">`;
    items.forEach(i => {
        const isGate = i.type === 'gate';
        let isInCart = false;
        let cartKey = i.name;
        if(isGate) {
            isInCart = Object.keys(cart).some(key => key.includes('গেইট'));
        } else {
            isInCart = cart[i.name] ? true : false;
        }
        const displayText = isGate ? 'গেইট' : `৳${i.price}`;
        
        let photoHtml = '';
        if(i.photo && !isGate) {
            photoHtml = `<div class="w-full h-12 mb-1 rounded-lg overflow-hidden bg-slate-100 opacity-80"><img src="${i.photo}" class="w-full h-full object-cover pointer-events-none"></div>`;
        } else if (!isGate) {
            photoHtml = `<div class="w-full h-12 mb-1 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300"><i class="fas fa-box text-lg"></i></div>`;
        }
        
        itemsHtml += `<div class="bg-white p-2 rounded-xl shadow-sm border ${isInCart ? 'border-green-500 bg-green-50' : 'border-slate-100'} flex flex-col justify-between h-full active:scale-95 transition cursor-pointer relative" onclick="openItemInput('${i.name}', ${i.price || 0}, '${i.type || 'normal'}', '${i.photo || ''}')">${isInCart ? '<div class="absolute top-1 right-1 text-green-500 z-10"><i class="fas fa-check-circle text-sm"></i></div>' : ''}${!isGate ? photoHtml : '<div class="w-full h-12 mb-1 rounded-lg bg-purple-50 flex items-center justify-center text-purple-300"><i class="fas fa-archway text-xl"></i></div>'}<div class="mb-1 text-center"><h4 class="font-bold text-slate-700 text-xs leading-tight">${i.name}</h4><p class="text-[10px] text-gray-400 mt-0.5">${displayText}</p></div></div>`;
    });
    itemsHtml += `</div>`;

    let addedListHtml = '';
    if(Object.keys(cart).length > 0) {
        addedListHtml = `<div class="bg-white rounded-xl shadow-sm p-3 mt-4 border border-slate-100"><h3 class="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">বেছে নেওয়া মালামাল</h3><div class="space-y-2">`;
        const cartEntries = Object.entries(cart);
        for(let [key, val] of cartEntries) {
            let itemPhoto = '';
            for(let cat in state.catalog) {
                for(let item of state.catalog[cat].items) {
                    if(item.name === key || (item.type === 'gate' && (key.includes('গেইট') || key.includes('Gate')))) {
                        itemPhoto = item.photo || '';
                        break;
                    }
                }
            }
            
            addedListHtml += `
            <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div class="flex items-center gap-2 overflow-hidden">
                    ${itemPhoto ? `<div class="w-8 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0"><img src="${itemPhoto}" class="w-full h-full object-cover opacity-80"></div>` : '<div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-300 text-xs flex-shrink-0"><i class="fas fa-box"></i></div>'}
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-700 truncate">${key}</p>
                        <p class="text-[10px] text-gray-500">${val.qty} x ${val.price} = ৳${val.total}</p>
                    </div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                     <button onclick="event.stopPropagation(); editCartItem('${key}')" class="w-7 h-7 bg-white rounded shadow-sm text-blue-500 text-xs border flex items-center justify-center"><i class="fas fa-pen"></i></button>
                     <button onclick="event.stopPropagation(); removeFromCart('${key}')" class="w-7 h-7 bg-white rounded shadow-sm text-red-500 text-xs border flex items-center justify-center"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }
        addedListHtml += `</div></div>`;
    }

    let phonesHtml = '';
    if(bookingData.phones && bookingData.phones.length > 0) {
        phonesHtml = `<div class="flex flex-wrap gap-2 mb-2">`;
        bookingData.phones.forEach((phone, idx) => {
            phonesHtml += `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">${phone} <i class="fas fa-times cursor-pointer" onclick="removePhone(${idx})"></i></span>`;
        });
        phonesHtml += `</div>`;
    }

    c.innerHTML = `
    <div class="bg-white p-5 rounded-2xl shadow-card mb-4">
        <h3 class="font-bold text-primary mb-4 border-b pb-2">${activeEventId ? 'বুকিং এডিট' : 'বুকিং তথ্য'}</h3>
        <input type="text" id="b_name" oninput="bookingData.name=this.value" value="${bookingData.name}" placeholder="ক্লায়েন্ট নাম" class="w-full bg-slate-50 p-3 rounded-xl mb-3 border outline-none">
        
        <div class="flex gap-2 mb-2">
            <input type="number" id="b_phone_input" placeholder="মোবাইল নাম্বার যোগ করুন" class="flex-1 bg-slate-50 p-3 rounded-xl border outline-none">
            <button onclick="addPhoneNumber()" class="bg-secondary text-white px-4 rounded-xl font-bold text-sm">+</button>
        </div>
        ${phonesHtml}
        <input type="hidden" id="b_phone" value="${bookingData.phone}">
        
        <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">শুরুর তারিখ</label>
                <input type="date" id="b_date" onchange="bookingData.date=this.value" value="${bookingData.date}" class="bg-slate-50 p-3 rounded-xl border w-full">
            </div>
            <div>
                <label class="block text-xs font-bold text-red-500 mb-1">শেষ/ফেরত তারিখ</label>
                <input type="date" id="b_end_date" onchange="bookingData.endDate=this.value" value="${bookingData.endDate}" class="bg-red-50 border border-red-100 p-3 rounded-xl w-full">
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-3">
            <select id="b_status" onchange="bookingData.status=this.value" class="bg-slate-50 p-3 rounded-xl border text-gray-600 w-full">
                <option value="চালু" ${bookingData.status==='চালু'?'selected':''}>চালু</option>
                <option value="অপেক্ষমান" ${bookingData.status==='অপেক্ষমান'?'selected':''}>অপেক্ষমান</option>
                <option value="সম্পন্ন" ${bookingData.status==='সম্পন্ন'?'selected':''}>সম্পন্ন</option>
                <option value="বাতিল" ${bookingData.status==='বাতিল'?'selected':''}>বাতিল</option>
            </select>
        </div>
        
        <input type="text" id="b_loc" oninput="bookingData.loc=this.value" value="${bookingData.loc}" placeholder="লোকেশন" class="w-full bg-slate-50 p-3 rounded-xl mb-3 border">
        
        <div class="mt-3">
            <label class="block text-xs font-bold text-gray-500 mb-1">নোট / বিশেষ নির্দেশনা</label>
            <textarea id="b_note" oninput="bookingData.note=this.value" placeholder="বুকিং সম্পর্কে গুরুত্বপূর্ণ তথ্য..." class="w-full bg-yellow-50 border border-yellow-100 p-3 rounded-xl focus:outline-none text-sm h-20 resize-none">${bookingData.note || ''}</textarea>
        </div>
    </div>
    <div class="mb-4"><h3 class="font-bold text-gray-700 mb-2 px-1">ক্যাটাগরি</h3>${catHtml}</div>
    <div><h3 class="font-bold text-gray-700 mb-2 px-1">মালামাল (${activeBookingCat})</h3>${itemsHtml}</div>
    
    ${addedListHtml}

    <div class="pb-24"></div>
    
    <div class="fixed bottom-16 left-0 w-full bg-white p-2 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-2xl flex justify-between items-center z-50">
        <div class="pl-2"><p class="text-[10px] text-gray-400">মোট বিল</p><h3 class="text-lg font-bold text-primary" id="total-view">৳0</h3></div>
        <button onclick="openConfirmModal()" class="bg-secondary text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg active:scale-95 transition">${activeEventId ? 'আপডেট করুন' : 'কনফার্ম'}</button>
    </div>`;
    
    updateTotal();
}

function addPhoneNumber() {
    const input = document.getElementById('b_phone_input');
    const phone = input.value.trim();
    if(phone && phone.length >= 11) {
        if(!bookingData.phones) bookingData.phones = [];
        if(!bookingData.phones.includes(phone)) {
            bookingData.phones.push(phone);
            bookingData.phone = bookingData.phones.join(', ');
        }
        input.value = '';
        renderBooking(document.getElementById('app'));
    } else {
        alert("সঠিক মোবাইল নাম্বার দিন");
    }
}

function removePhone(index) {
    if(bookingData.phones && bookingData.phones[index]) {
        bookingData.phones.splice(index, 1);
        bookingData.phone = bookingData.phones.join(', ');
        renderBooking(document.getElementById('app'));
    }
}

function setActiveCat(k) { activeBookingCat = k; renderBooking(document.getElementById('app')); }
function updateTotal() { const t = Object.values(cart).reduce((s,i) => s + i.total, 0); const el = document.getElementById('total-view'); if(el) el.innerText = '৳' + t; }

function removeFromCart(key) {
    delete cart[key];
    updateTotal();
    renderBooking(document.getElementById('app'));
}

function openItemInput(name, defaultPrice, type, photo = '') {
    currentModalItem = { name, price: defaultPrice, type, photo };
    let existing = cart[name]; 
    if(type !== 'gate' && cart[name]) { existing = cart[name]; } else { existing = null; }

    const title = document.getElementById('input-modal-title');
    const body = document.getElementById('item-input-body');
    title.innerText = name;

    const valQty = existing ? existing.qty : '';
    const valPrice = existing ? existing.price : '';
    
    let photoHtml = '';
    if(photo && type !== 'gate') {
        photoHtml = `<div class="mb-3 rounded-xl overflow-hidden h-24 bg-slate-100"><img src="${photo}" class="w-full h-full object-cover"></div>`;
    }
    
    if (type === 'gate') {
        body.innerHTML = `${photoHtml}<div><label class="block text-xs font-bold text-gray-500 mb-1">গেইটের ধরণ</label><select id="gate-type" onchange="toggleGateTop()" class="w-full bg-slate-50 border p-3 rounded-xl"><option value="ডাবল গেইট">ডাবল গেইট</option><option value="সিঙ্গেল গেইট">সিঙ্গেল গেইট</option><option value="নৌকা সিঙ্গেল গেইট">নৌকা সিঙ্গেল গেইট</option></select></div><div id="gate-top-div"><label class="block text-xs font-bold text-gray-500 mb-1">কয় টপ</label><select id="gate-top" class="w-full bg-slate-50 border p-3 rounded-xl"><option value="১ টপ">১ টপ</option><option value="২ টপ">২ টপ</option><option value="৩ টপ">৩ টপ</option><option value="৪ টপ">৪ টপ</option></select></div><div><label class="block text-xs font-bold text-gray-500 mb-1">মোট ভাড়া</label><input type="number" id="modal-price" value="${valPrice}" placeholder="2000" class="w-full bg-slate-50 border p-3 rounded-xl"></div><input type="hidden" id="modal-qty" value="1">`;
    } else {
        body.innerHTML = `${photoHtml}<div class="flex gap-3"><div class="flex-1"><label class="block text-xs font-bold text-gray-500 mb-1">পরিমাণ</label><input type="number" id="modal-qty" value="${valQty}" placeholder="1" class="w-full bg-slate-50 border p-3 rounded-xl font-bold text-lg text-center" autofocus></div><div class="flex-1"><label class="block text-xs font-bold text-gray-500 mb-1">দর</label><input type="number" id="modal-price" value="${valPrice}" placeholder="${defaultPrice}" class="w-full bg-slate-50 border p-3 rounded-xl font-bold text-lg text-center"></div></div>`;
    }
    document.getElementById('item-input-modal').classList.remove('hide');
}

function editCartItem(key) {
    event.stopPropagation();
    const item = cart[key];
    let foundType = 'normal';
    let foundPhoto = '';
    for(let cat in state.catalog) {
        for(let i of state.catalog[cat].items) {
            if(key.includes(i.name) || (i.type === 'gate' && (key.includes('গেইট') || key.includes('Gate')))) {
                foundType = i.type || 'normal';
                foundPhoto = i.photo || '';
                if(foundType === 'gate') { currentModalItem = { name: 'Gate', price: item.price, type: 'gate', photo: '' }; } 
                else { currentModalItem = { name: key, price: 0, type: 'normal', photo: foundPhoto }; }
                break;
            }
        }
    }
    const title = document.getElementById('input-modal-title');
    const body = document.getElementById('item-input-body');
    title.innerText = key; 
    
    let photoHtml = '';
    if(foundPhoto && foundType !== 'gate') {
        photoHtml = `<div class="mb-3 rounded-xl overflow-hidden h-24 bg-slate-100"><img src="${foundPhoto}" class="w-full h-full object-cover"></div>`;
    }
    
    if (foundType === 'gate') {
         body.innerHTML = `${photoHtml}<div><label class="block text-xs font-bold text-gray-500 mb-1">মোট ভাড়া</label><input type="number" id="modal-price" value="${item.price}" class="w-full bg-slate-50 border p-3 rounded-xl"></div><input type="hidden" id="modal-qty" value="1"><input type="hidden" id="is-edit-key" value="${key}">`;
    } else {
        body.innerHTML = `${photoHtml}<div class="flex gap-3"><div class="flex-1"><label class="block text-xs font-bold text-gray-500 mb-1">পরিমাণ</label><input type="number" id="modal-qty" value="${item.qty}" class="w-full bg-slate-50 border p-3 rounded-xl font-bold text-lg text-center" autofocus></div><div class="flex-1"><label class="block text-xs font-bold text-gray-500 mb-1">দর</label><input type="number" id="modal-price" value="${item.price}" class="w-full bg-slate-50 border p-3 rounded-xl font-bold text-lg text-center"></div></div><input type="hidden" id="is-edit-key" value="${key}">`;
    }
    document.getElementById('item-input-modal').classList.remove('hide');
}

function toggleGateTop() {
    const type = document.getElementById('gate-type').value;
    const topDiv = document.getElementById('gate-top-div');
    if(type.includes('নৌকা')) topDiv.classList.add('hide'); else topDiv.classList.remove('hide');
}

function confirmItemInput() {
    const qtyInput = document.getElementById('modal-qty').value;
    const priceInput = document.getElementById('modal-price').value;
    const editKey = document.getElementById('is-edit-key') ? document.getElementById('is-edit-key').value : null;
    const qty = parseInt(qtyInput);
    const price = parseInt(priceInput);

    if(!qty || qty <= 0) {
         if(editKey) { delete cart[editKey]; }
         else if(currentModalItem.type !== 'gate') { delete cart[currentModalItem.name]; }
         closeModal('item-input-modal');
         updateTotal();
         renderBooking(document.getElementById('app')); 
         return;
    }
    
    const finalPrice = isNaN(price) ? (editKey ? cart[editKey].price : currentModalItem.price) : price;
    let itemName = currentModalItem.name;
    if(editKey) { itemName = editKey; } 
    else if(currentModalItem.type === 'gate') {
        const gType = document.getElementById('gate-type').value;
        if(!gType.includes('নৌকা')) { const gTop = document.getElementById('gate-top').value; itemName = `${gType} (${gTop})`; } else itemName = gType;
    }
    cart[itemName] = { qty, price: finalPrice, total: qty * finalPrice };
    closeModal('item-input-modal');
    updateTotal();
    renderBooking(document.getElementById('app')); 
}

function openConfirmModal() {
    const total = Object.values(cart).reduce((s,i) => s + i.total, 0);
    if(!bookingData.name) return alert("দয়া করে গ্রাহকের নাম দিন");
    if(!bookingData.date) return alert("অনুষ্ঠানের তারিখ সিলেক্ট করুন");
    if(!bookingData.endDate) return alert("ফেরতের তারিখ সিলেক্ট করুন");
    if(total === 0) return alert("অন্তত একটি মালামাল যোগ করুন");

    document.getElementById('conf-total').innerText = '৳' + total;
    
    if(activeEventId) {
        const e = state.events.find(x => x.id === activeEventId);
        if(e) {
            document.getElementById('conf-final').value = e.finalTotal || (e.total - e.discount);
            document.getElementById('conf-adv').value = e.advance;
        }
    } else {
        document.getElementById('conf-final').value = total;
        document.getElementById('conf-adv').value = ''; 
    }
    
    document.getElementById('confirm-booking-modal').classList.remove('hide');
}

function completeBooking() {
    const totalText = document.getElementById('conf-total').innerText;
    const total = parseInt(totalText.replace(/[^0-9]/g, '')) || 0; 
    const finalInput = document.getElementById('conf-final').value;
    const advInput = document.getElementById('conf-adv').value;
    const final = finalInput ? parseInt(finalInput) : total;
    const adv = advInput ? parseInt(advInput) : 0;
    const discount = total - final;
    const due = final - adv;

    let evt;
    
    if(activeEventId) {
        const idx = state.events.findIndex(x => x.id === activeEventId);
        if(idx > -1) {
            const oldEvent = state.events[idx];
            evt = { 
                id: oldEvent.id, 
                client: bookingData.name, 
                phone: bookingData.phone || '', 
                phones: bookingData.phones || [],
                date: bookingData.date, 
                endDate: bookingData.endDate,
                location: bookingData.loc || '', 
                note: bookingData.note || '',
                items: JSON.parse(JSON.stringify(cart)), 
                total: total,
                finalTotal: final,
                advance: adv, 
                discount: discount, 
                due: due, 
                status: bookingData.status || 'চালু', 
                missingItems: oldEvent.missingItems || false, 
                returns: oldEvent.returns || {},
                history: oldEvent.history || []
            };
            if(!evt.history) evt.history = [];
            evt.history.push({
                date: new Date().toISOString(),
                total: total,
                finalTotal: final,
                advance: adv,
                discount: discount,
                due: due,
                action: 'updated'
            });
            state.events[idx] = evt;
        }
    } else {
        evt = { 
            id: Date.now().toString(), 
            client: bookingData.name, 
            phone: bookingData.phone || '', 
            phones: bookingData.phones || [],
            date: bookingData.date, 
            endDate: bookingData.endDate,
            location: bookingData.loc || '', 
            note: bookingData.note || '',
            items: JSON.parse(JSON.stringify(cart)), 
            total: total,
            finalTotal: final,
            advance: adv, 
            discount: discount, 
            due: due, 
            status: bookingData.status || 'চালু', 
            missingItems: false, 
            returns: {},
            history: [{
                date: new Date().toISOString(),
                total: total,
                finalTotal: final,
                advance: adv,
                discount: discount,
                due: due,
                action: 'created'
            }]
        };
        state.events.push(evt);
    }

    saveData('events', state.events); 
    lastSavedEvent = evt;

    cart = {}; 
    bookingData = { name: '', phone: '', phones: [], date: '', endDate: '', loc: '', status: 'চালু', note: '' };
    activeEventId = null;
    closeModal('confirm-booking-modal');
    
    document.getElementById('success-modal').classList.remove('hide');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hide');
    if(lastSavedEvent) {
        showSlip(lastSavedEvent);
        lastSavedEvent = null;
    } else {
        router('dashboard');
    }
}

// --- WORKERS ---
function renderWorkers(c) {
    c.innerHTML = `<div class="bg-white p-5 rounded-2xl shadow-card mb-24">
        <div class="flex justify-between items-center mb-6">
            <h2 class="font-bold text-xl text-primary">কারিগর তালিকা</h2>
            <button onclick="openWorkerModal()" class="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-bold shadow active:scale-95 transition">+ নতুন</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
            ${state.workers.map(w => `
                <div class="bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-4 rounded-2xl text-center shadow-lg relative group hover:shadow-xl transition-all duration-300">
                    <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="openWorkerModal(${w.id})" class="w-7 h-7 bg-white rounded-full shadow text-blue-500 text-xs hover:bg-blue-50"><i class="fas fa-pen"></i></button>
                        <button onclick="deleteWorker(${w.id})" class="w-7 h-7 bg-white rounded-full shadow text-red-500 text-xs hover:bg-red-50"><i class="fas fa-trash"></i></button>
                    </div>
                    
                    <div class="worker-img-container w-20 h-20 mx-auto mb-3 rounded-2xl border-4 border-white shadow-lg overflow-hidden ${w.photo ? 'cursor-pointer' : ''}" ${w.photo ? `onclick="showZoomModal('${w.photo}')"` : ''}>
                        ${w.photo ? `<img src="${w.photo}" class="w-full h-full object-cover">` : '<div class="w-full h-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-2xl"><i class="fas fa-user"></i></div>'}
                    </div>
                    
                    <h3 class="font-bold text-slate-800 text-lg mb-1">${w.name}</h3>
                    <p class="text-xs text-gray-500 mb-3 flex items-center justify-center gap-1"><i class="fas fa-phone text-[10px]"></i> ${w.phone || 'নম্বর নেই'}</p>
                    
                    ${w.phone ? `
                    <div class="flex gap-2 justify-center">
                        <a href="tel:${w.phone}" class="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-bold shadow hover:bg-green-600 transition flex items-center justify-center gap-2">
                            <i class="fas fa-phone-alt"></i> কল
                        </a>
                        <a href="https://wa.me/${w.phone}" class="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold shadow hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                            <i class="fab fa-whatsapp"></i> মেসেজ
                        </a>
                    </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ${state.workers.length === 0 ? '<div class="text-center text-gray-400 py-10"><i class="fas fa-hard-hat text-4xl mb-3 opacity-30"></i><p>কোন কারিগর যোগ করা হয়নি</p></div>' : ''}
    </div>`;
}

function showZoomModal(src) {
    document.getElementById('zoomed-image').src = src;
    document.getElementById('zoom-modal').classList.remove('hide');
}

function closeZoomModal() {
    document.getElementById('zoom-modal').classList.add('hide');
}

function openWorkerModal(id = null) { 
    const m = document.getElementById('worker-modal'); 
    if(id) { 
        const w = state.workers.find(x => x.id === id); 
        document.getElementById('w-id').value = w.id; 
        document.getElementById('w-name').value = w.name; 
        document.getElementById('w-phone').value = w.phone; 
    } else { 
        document.getElementById('w-id').value = ''; 
        document.getElementById('w-name').value = ''; 
        document.getElementById('w-phone').value = ''; 
    } 
    document.getElementById('w-photo').value = ''; 
    m.classList.remove('hide'); 
}

function saveWorkerData() { 
    const id = document.getElementById('w-id').value;
    const name = document.getElementById('w-name').value;
    const phone = document.getElementById('w-phone').value;
    const photoInput = document.getElementById('w-photo');
    
    if(!name) return alert("নাম দিন"); 
    
    let existingPhoto = '';
    if(id) {
        const existing = state.workers.find(w => w.id == id);
        if(existing) existingPhoto = existing.photo || '';
    }
    
    const finalizeSave = (photoBase64) => {
        if(id) { 
            const idx = state.workers.findIndex(w => w.id == id); 
            if(idx > -1) { 
                state.workers[idx].name = name; 
                state.workers[idx].phone = phone;
                state.workers[idx].photo = photoBase64;
            } 
        } else { 
            state.workers.push({ id: Date.now(), name, phone, photo: photoBase64 }); 
        } 
        saveData('workers', state.workers); 
        closeModal('worker-modal'); 
        renderWorkers(document.getElementById('app')); 
    };
    
    if(photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            finalizeSave(e.target.result);
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        finalizeSave(existingPhoto);
    }
}

function deleteWorker(id){
    if(confirm('মুছে ফেলবেন?')){
        state.workers=state.workers.filter(w=>w.id!==id); 
        saveData('workers',state.workers); 
        renderWorkers(document.getElementById('app'));
    }
}

// --- SETTINGS ---
function renderSettings(c) {
    c.innerHTML = `<div class="bg-white p-5 rounded-2xl shadow-card mb-24"><h2 class="font-bold text-xl mb-4 text-primary border-b pb-2">দোকান তথ্য</h2><div class="space-y-3 mb-6"><input type="text" id="set-shop-name" value="${state.settings.shopName}" class="w-full bg-slate-50 border p-3 rounded-xl"><input type="text" id="set-shop-addr" value="${state.settings.shopAddress}" class="w-full bg-slate-50 border p-3 rounded-xl"><input type="text" id="set-shop-phone" value="${state.settings.shopPhone}" class="w-full bg-slate-50 border p-3 rounded-xl"><button onclick="saveShopSettings()" class="w-full bg-secondary text-white py-2 rounded-xl font-bold">আপডেট</button></div><h2 class="font-bold text-xl mb-4 text-primary border-b pb-2">মালামাল সেটআপ</h2><div id="settings-list" class="space-y-4">${Object.entries(state.catalog).map(([key, cat]) => `<div class="bg-${cat.color.split('-')[1] || 'gray'}-50 p-4 rounded-xl border border-slate-100 shadow-sm"><div class="flex justify-between items-center mb-3"><div class="flex items-center gap-2 font-bold text-slate-700"><div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><i class="fas ${cat.icon} ${cat.color}"></i></div><span>${key}</span><span class="text-xs font-normal text-gray-500">(${cat.items.length} টি)</span></div><div class="flex gap-2"><button onclick="openSetupModal('add', '${key}')" class="bg-white p-2 rounded text-blue-500 shadow-sm text-xs border"><i class="fas fa-plus"></i></button><button onclick="deleteCategory('${key}')" class="bg-white p-2 rounded text-red-500 shadow-sm text-xs border"><i class="fas fa-trash"></i></button></div></div><div class="grid grid-cols-2 gap-2">${cat.items.map((item, idx) => `<div class="bg-white border border-slate-200 p-2 rounded-xl shadow-sm relative group"><div class="h-16 bg-slate-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">${item.photo ? `<img src="${item.photo}" class="w-full h-full object-cover cursor-pointer" onclick="showZoomModal('${item.photo}')">` : '<i class="fas fa-box text-slate-300"></i>'}</div><div class="flex justify-between items-start"><div><p class="font-medium text-slate-700 text-sm truncate">${item.name}</p><p class="text-xs text-gray-400">৳${item.price}</p></div><div class="flex flex-col gap-1"><i onclick="openSetupModal('edit', '${key}', ${idx})" class="fas fa-pen text-[10px] text-blue-400 cursor-pointer bg-blue-50 w-6 h-6 flex items-center justify-center rounded-full"></i><i onclick="delItem('${key}', ${idx})" class="fas fa-times text-[10px] text-red-400 cursor-pointer bg-red-50 w-6 h-6 flex items-center justify-center rounded-full"></i></div></div></div>`).join('')}</div></div>`).join('')}</div>
    
    <div class="mt-6 pt-6 border-t-2 border-primary/20">
        <h2 class="font-bold text-lg mb-3 text-primary">রিপোর্টসমূহ</h2>
        <button onclick="router('all-events')" class="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg mb-3 flex items-center justify-center gap-2">
            <i class="fas fa-list-alt"></i> সকল বুকিং এর তালিকা দেখুন
        </button>
    </div>
    
    <div class="mt-6 pt-6 border-t-2 border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl">
        <h2 class="font-bold text-lg mb-4 text-primary flex items-center gap-2">
            <i class="fas fa-code"></i> ডেভলপার তথ্য
        </h2>
        <div class="text-center">
            <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-primary flex items-center justify-center text-white text-3xl shadow-lg">
                <i class="fas fa-user-tie"></i>
            </div>
            <h3 class="font-bold text-xl text-slate-800 mb-1">মোঃ সজিব আহমেদ</h3>
            <p class="text-sm text-gray-500 mb-3">(Misel)</p>
            
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
                <p class="text-xs text-gray-500 leading-relaxed">
                    এই অ্যাপটি বানানোর উদ্দেশ্য ছিল ইভেন্ট বুকিং সহজ করা, হিসাব-নিকাশ সহজ করা, এবং মালামাল যাতে না হারায় সেই প্রবলেম গুলো সমাধান করা।
                </p>
            </div>
            
            <div class="flex gap-3 justify-center">
                <a href="https://www.facebook.com/profile.php?id=100089189018672" target="_blank" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <i class="fab fa-facebook-f"></i> প্রোফাইল
                </a>
                <a href="https://www.facebook.com/profile.php?id=100089189018672" target="_blank" class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold shadow hover:bg-blue-600 transition flex items-center justify-center gap-2">
                    <i class="fas fa-store"></i> পেইজ
                </a>
            </div>
        </div>
    </div>
    
    <div class="mt-4 pt-4 border-t"><button onclick="addCategory()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg mb-2">নতুন ক্যাটাগরি তৈরি করুন</button><button onclick="if(confirm('সব ডাটা মুছে যাবে!')){localStorage.clear();location.reload()}" class="w-full bg-red-100 text-red-600 py-3 rounded-xl font-bold">ডাটা রিসেট</button></div></div>`;
}

function previewItemPhoto(input) {
    const preview = document.getElementById('current-item-photo-preview');
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" class="w-full h-32 object-cover rounded-lg">`;
            preview.classList.remove('hide');
            tempItemPhoto = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function openSetupModal(mode, key, idx = null) { 
    document.getElementById('setup-mode').value = mode; 
    document.getElementById('setup-key').value = key; 
    document.getElementById('setup-idx').value = idx; 
    document.getElementById('setup-title').innerText = mode === 'add' ? 'নতুন আইটেম' : 'আইটেম এডিট'; 
    
    const previewDiv = document.getElementById('current-item-photo-preview');
    previewDiv.classList.add('hide');
    tempItemPhoto = null;
    document.getElementById('setup-photo').value = '';
    
    if(mode === 'edit') { 
        const item = state.catalog[key].items[idx]; 
        document.getElementById('setup-name').value = item.name; 
        document.getElementById('setup-price').value = item.price;
        if(item.photo) {
            previewDiv.innerHTML = `<img src="${item.photo}" class="w-full h-32 object-cover rounded-lg">`;
            previewDiv.classList.remove('hide');
            tempItemPhoto = item.photo;
        }
    } else { 
        document.getElementById('setup-name').value = ''; 
        document.getElementById('setup-price').value = ''; 
    } 
    document.getElementById('setup-modal').classList.remove('hide'); 
}

function saveSetupData() { 
    const mode = document.getElementById('setup-mode').value, key = document.getElementById('setup-key').value, idx = document.getElementById('setup-idx').value, name = document.getElementById('setup-name').value, price = parseInt(document.getElementById('setup-price').value) || 0; 
    if(!name) return alert("নাম দিন"); 
    
    if(mode === 'add') {
        state.catalog[key].items.push({name, price, photo: tempItemPhoto || ''});
    } else { 
        const old = state.catalog[key].items[idx];
        state.catalog[key].items[idx] = {...old, name, price, photo: tempItemPhoto || old.photo || ''};
    } 
    saveData('catalog', state.catalog); 
    closeModal('setup-modal'); 
    renderSettings(document.getElementById('app')); 
}

function delItem(k, i) { if(confirm("মুছে ফেলবেন?")) { state.catalog[k].items.splice(i, 1); saveData('catalog', state.catalog); renderSettings(document.getElementById('app')); } }
function deleteCategory(k) { if(confirm("মুছে ফেলবেন?")) { delete state.catalog[k]; saveData('catalog', state.catalog); renderSettings(document.getElementById('app')); } }
function addCategory() { const n = prompt("ক্যাটাগরি নাম (ইংরেজিতে):"); if(n) { state.catalog[n] = {icon: 'fa-box', color: 'text-gray-600', items: []}; saveData('catalog', state.catalog); renderSettings(document.getElementById('app')); } }
function saveShopSettings() { state.settings.shopName = document.getElementById('set-shop-name').value; state.settings.shopAddress = document.getElementById('set-shop-addr').value; state.settings.shopPhone = document.getElementById('set-shop-phone').value; saveData('settings', state.settings); alert("সেভ হয়েছে"); }

// --- EVENT VIEW ---
function viewEvent(id) {
    activeEventId = id; const e = state.events.find(x => x.id === id); if(!e) return;
    const app = document.getElementById('app');
    let itemsHtml = '';
    for(let [k,v] of Object.entries(e.items)) {
        const ret = e.returns?.[k] || 0; const sent = v.qty; const done = ret >= sent;
        itemsHtml += `<div class="bg-white p-4 rounded-xl shadow-sm border ${done?'border-green-200 bg-green-50':'border-slate-100'} flex justify-between items-center mb-2"><div><p class="font-bold text-sm text-slate-800">${k}</p><span class="text-[10px] bg-slate-200 px-2 py-0.5 rounded">নিয়েছে: ${sent}</span></div><div class="flex flex-col items-end"><label class="text-[10px] text-gray-400 mb-1">ফেরত</label><input type="number" value="${ret}" class="w-16 h-10 border ${done?'border-green-400 text-green-700':'border-slate-300'} rounded-lg text-center font-bold text-lg focus:outline-none" oninput="updateReturnVisuals(this, ${sent})" onchange="saveReturnData('${id}','${k}',this.value)"></div></div>`;
    }
    let payBox = ''; if(e.due > 0) { payBox = `<div class="bg-red-50 p-4 rounded-xl border border-red-100 mb-6"><div class="flex justify-between items-center mb-2"><h4 class="font-bold text-red-600"><i class="fas fa-money-bill-wave"></i> বকেয়া আদায়</h4><span class="text-xs font-bold bg-white px-2 py-1 rounded text-red-500">বাকি: ৳${e.due}</span></div><div class="flex gap-2 mb-2"><input type="number" id="pay-amount-${id}" placeholder="জমা" class="flex-1 border p-2 rounded-lg text-sm"></div><div class="flex gap-2"><input type="number" id="pay-disc-${id}" placeholder="ছাড়" class="flex-1 border border-orange-200 p-2 rounded-lg text-sm"><button onclick="collectPayment('${id}')" class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow">আপডেট</button></div></div>`; }
    
    let noteHtml = '';
    if(e.note) {
        noteHtml = `<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4"><div class="flex items-center gap-2 mb-2 text-yellow-700"><i class="fas fa-sticky-note"></i><span class="text-xs font-bold uppercase">নোট</span></div><p class="text-sm text-gray-700 leading-relaxed">${e.note}</p></div>`;
    }
    
    let phoneHtml = '';
    if(e.phones && e.phones.length > 0) {
        phoneHtml = `<div class="flex flex-wrap gap-2 mt-2">`;
        e.phones.forEach(phone => {
            phoneHtml += `<a href="tel:${phone}" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1"><i class="fas fa-phone text-[10px]"></i> ${phone}</a>`;
        });
        phoneHtml += `</div>`;
    } else if(e.phone) {
        phoneHtml = `<p class="text-sm text-gray-500 mt-1"><i class="fas fa-phone text-[10px] mr-1"></i>${e.phone}</p>`;
    }
    
    const startDay = getBengaliDayName(e.date);
    const endDay = e.endDate ? getBengaliDayName(e.endDate) : '';
    const isOverdue = isDateOverdue(e.endDate);
    const isToday = isDateToday(e.endDate);
    const daysOverdue = getDaysOverdue(e.endDate);
    
    app.innerHTML = `<div class="bg-white p-5 rounded-2xl shadow-card pb-24"><div class="flex justify-between items-center mb-4 border-b pb-3"><button onclick="router('dashboard')" class="text-gray-400"><i class="fas fa-arrow-left"></i></button><h2 class="font-bold text-xl text-primary">${e.client}</h2><div class="flex gap-2"><button onclick="editEvent('${id}')" class="bg-blue-50 text-blue-500 p-2 rounded-full" title="এডিট করুন"><i class="fas fa-edit"></i></button><button onclick="showSlip(state.events.find(x=>x.id=='${id}'))" class="bg-slate-100 p-2 rounded-full"><i class="fas fa-receipt text-secondary"></i></button><button onclick="showHistory('${id}')" class="bg-purple-50 text-purple-500 p-2 rounded-full" title="হিস্টরি দেখুন"><i class="fas fa-history"></i></button><button onclick="deleteEvent('${id}')" class="bg-red-50 text-red-500 p-2 rounded-full"><i class="fas fa-trash"></i></button></div></div>${e.missingItems?`<div class="bg-red-100 text-red-600 text-xs font-bold p-2 rounded mb-4 border border-red-200">⚠️ মালামাল মিসিং!</div>`:''}${noteHtml}<div class="bg-blue-50 p-3 rounded-xl mb-4 flex gap-2 items-center border border-blue-100"><p class="text-xs font-bold text-blue-800">স্ট্যাটাস:</p><select id="status-${id}" class="bg-white border text-sm p-2 rounded-lg flex-1 outline-none">
        <option value="চালু" ${e.status==='চালু'?'selected':''}>চালু</option>
        <option value="অপেক্ষমান" ${e.status==='অপেক্ষমান'?'selected':''}>অপেক্ষমান</option>
        <option value="সম্পন্ন" ${e.status==='সম্পন্ন'?'selected':''}>সম্পন্ন</option>
        <option value="বাতিল" ${e.status==='বাতিল'?'selected':''}>বাতিল</option>
    </select><button onclick="changeStatus('${id}')" class="bg-primary text-white text-xs px-3 py-2 rounded-lg font-bold">আপডেট</button></div>
    
    <div class="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-xl border border-primary/20 mb-4">
        <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold text-primary">ইভেন্ট সময়কাল</span>
            ${isOverdue?'<span class="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-bold">অতিক্রান্ত</span>':(isToday?'<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded font-bold">আজ ফেরত</span>':'')}
        </div>
        <div class="flex justify-between items-center">
            <div class="text-center cursor-pointer" onclick="alert('${startDay}')">
                <p class="text-[10px] text-gray-500">শুরু</p>
                <p class="font-bold text-slate-800 text-sm">${e.date}</p>
                <p class="text-xs text-primary font-bold">${startDay}</p>
            </div>
            <div class="px-3"><i class="fas fa-arrow-right text-gray-400"></i></div>
            <div class="text-center cursor-pointer" onclick="alert('${endDay}')">
                <p class="text-[10px] text-gray-500">শেষ / ফেরত</p>
                <p class="font-bold ${isOverdue?'text-red-600':(isToday?'text-green-600':'text-slate-800')} text-sm">${e.endDate || 'নির্ধারিত নয়'}</p>
                <p class="text-xs ${isOverdue?'text-red-600':(isToday?'text-green-600':'text-primary')} font-bold">${endDay || ''}</p>
                ${isOverdue?`<p class="text-[10px] text-red-500 mt-1 font-bold">(${daysOverdue} দিন অতিক্রান্ত)</p>`:''}
            </div>
        </div>
    </div>
    
    <div class="grid grid-cols-4 gap-1 text-center text-sm mb-6 bg-slate-50 p-2 rounded-xl border border-slate-100">
        <div><p class="text-gray-400 text-[10px]">মোট</p><b>${e.total}</b></div>
        <div><p class="text-gray-400 text-[10px]">ফাইনাল</p><b class="text-primary">${e.finalTotal || e.total}</b></div>
        <div><p class="text-gray-400 text-[10px]">জমা</p><b class="text-green-600">${e.advance}</b></div>
        <div><p class="text-gray-400 text-[10px]">বাকি</p><b class="text-red-600">${e.due}</b></div>
    </div>${payBox}<h3 class="font-bold text-gray-700 mb-3 text-sm">মালামাল ফেরত আপডেট</h3><div class="mb-6">${itemsHtml}</div>${phoneHtml}</div>`;
}

function showHistory(id) {
    const e = state.events.find(x => x.id === id);
    if(!e || !e.history) return;
    
    const content = document.getElementById('history-content');
    content.innerHTML = e.history.map((h, idx) => `
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold text-primary">#${idx + 1} - ${h.action === 'created' ? 'তৈরি' : 'আপডেট'}</span>
                <span class="text-[10px] text-gray-500">${new Date(h.date).toLocaleString('bn-BD')}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>মোট: <b>৳${h.total}</b></div>
                <div>ফাইনাল: <b>৳${h.finalTotal}</b></div>
                <div>জমা: <b>৳${h.advance}</b></div>
                <div>ছাড়: <b>৳${h.discount}</b></div>
                <div class="col-span-2 text-red-600">বাকি: <b>৳${h.due}</b></div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('history-modal').classList.remove('hide');
}

function editEvent(id) {
    const e = state.events.find(x => x.id === id);
    if(!e) return;
    activeEventId = id;
    bookingData = {
        name: e.client,
        phone: e.phone,
        phones: e.phones || [],
        date: e.date,
        endDate: e.endDate || '',
        loc: e.location,
        status: e.status,
        note: e.note || ''
    };
    cart = JSON.parse(JSON.stringify(e.items));
    router('booking');
}

function updateReturnVisuals(input, sent) { const val = parseInt(input.value) || 0; const parent = input.closest('.bg-white'); if(val >= sent) { parent.classList.remove('border-slate-100'); parent.classList.add('border-green-200', 'bg-green-50'); } else { parent.classList.remove('border-green-200', 'bg-green-50'); parent.classList.add('border-slate-100'); } }
function saveReturnData(id, item, val) { const e = state.events.find(x => x.id === id); if(!e.returns) e.returns = {}; e.returns[item] = parseInt(val) || 0; saveData('events', state.events); }
function deleteEvent(id) { if(confirm("ডিলিট করবেন?")) { state.events = state.events.filter(x => x.id !== id); saveData('events', state.events); router('dashboard'); } }
function changeStatus(id) {
    const newStatus = document.getElementById(`status-${id}`).value; const e = state.events.find(x => x.id === id);
    if(newStatus === 'সম্পন্ন') {
        if(e.due > 0) { alert("বকেয়া টাকা আছে!"); document.getElementById(`status-${id}`).value = e.status; return; }
        let missing = []; for(let [k,v] of Object.entries(e.items)) { const ret = e.returns?.[k] || 0; if(ret < v.qty) missing.push(`${k}`); }
        if(missing.length > 0) { tempEventIdForWarning = id; document.getElementById('missing-list-display').innerHTML = missing.map(m=>`<div>• ${m}</div>`).join(''); document.getElementById('warning-modal').classList.remove('hide'); return; }
        e.missingItems = false;
    }
    e.status = newStatus; saveData('events', state.events); alert("আপডেট হয়েছে"); viewEvent(id);
}
function forceCompleteEvent() { const e = state.events.find(x => x.id === tempEventIdForWarning); e.status = 'সম্পন্ন'; e.missingItems = true; saveData('events', state.events); closeModal('warning-modal'); viewEvent(tempEventIdForWarning); }
function collectPayment(id) { 
    const pay = parseInt(document.getElementById(`pay-amount-${id}`).value)||0; 
    const disc = parseInt(document.getElementById(`pay-disc-${id}`).value)||0; 
    if(pay===0 && disc===0) return alert("পরিমাণ দিন"); 
    const e = state.events.find(x => x.id === id); 
    if(pay+disc > e.due) return alert("বেশি হয়ে গেছে"); 
    
    if(!e.history) e.history = [];
    e.history.push({
        date: new Date().toISOString(),
        total: e.total,
        finalTotal: e.finalTotal || e.total,
        advance: e.advance + pay,
        discount: (e.discount||0) + disc,
        due: e.due - pay - disc,
        action: 'payment'
    });
    
    e.advance += pay; 
    e.discount = (e.discount||0) + disc; 
    e.due = e.total - e.advance - e.discount; 
    saveData('events', state.events); 
    viewEvent(id); 
}
function closeModal(id) { document.getElementById(id).classList.add('hide'); }
function toggleNotifications() { document.getElementById('notif-panel').classList.toggle('hide'); }

function updateNotifications() {
    const list = document.getElementById('notif-list'); 
    const badge = document.getElementById('notif-badge'); 
    let c = 0, h = '';
    
    state.events.forEach(e => { 
        if(e.status === 'সম্পন্ন' && e.missingItems) { 
            c++; 
            h += `<div onclick="viewEvent('${e.id}');toggleNotifications()" class="p-2 bg-red-50 rounded border border-red-100 cursor-pointer hover:bg-red-100"><p class="text-xs font-bold text-red-600">${e.client} (Missing)</p></div>`; 
        } 
        if(e.status === 'সম্পন্ন' && e.due > 0) { 
            c++; 
            h += `<div onclick="viewEvent('${e.id}');toggleNotifications()" class="p-2 bg-yellow-50 rounded border border-yellow-100 cursor-pointer hover:bg-yellow-100"><p class="text-xs font-bold text-orange-600">${e.client} (Due)</p></div>`; 
        }
        if(e.status !== 'সম্পন্ন' && e.status !== 'বাতিল' && e.endDate && isDateOverdue(e.endDate)) {
            let hasPendingItems = false;
            for(let [k,v] of Object.entries(e.items)) {
                const ret = e.returns?.[k] || 0;
                if(ret < v.qty) {
                    hasPendingItems = true;
                    break;
                }
            }
            if(hasPendingItems || e.due > 0) {
                c++;
                const daysOverdue = getDaysOverdue(e.endDate);
                h += `<div onclick="viewEvent('${e.id}');toggleNotifications()" class="p-2 bg-red-100 rounded border border-red-200 cursor-pointer hover:bg-red-200"><p class="text-xs font-bold text-red-700">${e.client} - ফেরত তারিখ অতিক্রান্ত!</p><p class="text-[10px] text-red-600">${daysOverdue} দিন অতিক্রান্ত - ${formatDateWithDay(e.endDate)}</p></div>`;
            }
        }
    });
    
    list.innerHTML = c ? h : '<p class="text-center text-xs text-gray-400">খালি</p>'; 
    badge.className = c ? 'absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-primary' : 'hide';
}

function toggleRateColumn() { const show = document.getElementById('toggle-rate').checked; document.querySelectorAll('.rate-col').forEach(el => el.style.display = show ? 'table-cell' : 'none'); }
function toggleSerialColumn() { const show = document.getElementById('toggle-serial').checked; document.querySelectorAll('.serial-col').forEach(el => el.style.display = show ? 'table-cell' : 'none'); }
function downloadSlipAsImage() { html2canvas(document.getElementById('slip-content'), {scale: 2}).then(c => { const a = document.createElement('a'); a.download = 'Invoice.jpg'; a.href = c.toDataURL('image/jpeg'); a.click(); }); }

function showSlip(e) { 
    document.getElementById('slip-shop-name').innerText = state.settings.shopName; 
    document.getElementById('slip-shop-addr').innerText = state.settings.shopAddress; 
    document.getElementById('slip-shop-phone').innerText = state.settings.shopPhone; 
    document.getElementById('s-name').innerText = e.client; 
    document.getElementById('s-phone').innerText = e.phone; 
    document.getElementById('s-date').innerText = e.date; 
    document.getElementById('s-id').innerText = '#'+e.id.slice(-4); 
    document.getElementById('s-loc').innerText = e.location; 
    document.getElementById('s-status').innerText = e.status; 
    
    document.getElementById('s-start-date').innerText = formatDateWithDay(e.date);
    document.getElementById('s-end-date').innerText = e.endDate ? formatDateWithDay(e.endDate) : 'নির্ধারিত নয়';
    
    const tbody = document.getElementById('s-body'); 
    const itemEntries = Object.entries(e.items);
    tbody.innerHTML = itemEntries.map(([k,v], index) => `
        <tr class="border-b border-dashed">
            <td class="p-2 text-center serial-col font-bold text-gray-500">${index + 1}</td>
            <td class="p-2">${k}</td>
            <td class="p-2 text-center">${v.qty}</td>
            <td class="p-2 text-right rate-col">${v.price||'-'}</td>
            <td class="p-2 text-right font-bold">${v.total}</td>
        </tr>
    `).join(''); 
    
    const displayTotal = e.finalTotal || e.total;
    document.getElementById('s-total').innerText = displayTotal; 
    document.getElementById('s-adv').innerText = e.advance; 
    document.getElementById('s-disc').innerText = e.discount; 
    document.getElementById('s-due').innerText = e.due; 
    document.getElementById('slip-modal').classList.remove('hide'); 
    toggleRateColumn();
    toggleSerialColumn();
}

function renderCalendar(c) { 
    const d = currentCalDate;
    const m = d.getMonth(), y = d.getFullYear(); 
    const days = new Date(y, m + 1, 0).getDate(); 
    const first = new Date(y, m, 1).getDay();
    
    const monthNames = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    
    let h = `<div class="bg-white p-5 rounded-2xl shadow-card mb-24">
        <div class="flex justify-between items-center mb-4">
            <button onclick="changeMonth(-1)" class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-primary active:scale-95 transition"><i class="fas fa-chevron-left"></i></button>
            <h2 class="text-center font-bold text-xl text-primary">${monthNames[m]} ${y}</h2>
            <button onclick="changeMonth(1)" class="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-primary active:scale-95 transition"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold mb-2">
            <div>রবি</div><div>সোম</div><div>মঙ্গল</div><div>বুধ</div><div>বৃহঃ</div><div>শুক্র</div><div>শনি</div>
        </div>
        <div class="grid grid-cols-7 gap-2">`; 
    
    for(let i=0; i<first; i++) h += `<div></div>`; 
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;
    
    for(let i=1; i<=days; i++) { 
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const has = state.events.some(e => e.date === dateStr || e.endDate === dateStr);
        const isToday = isCurrentMonth && i === today.getDate() ? 'today' : '';
        h += `<div onclick="filterDate('${dateStr}')" class="calendar-day ${has?'has-event':''} ${isToday}">${i}</div>`; 
    } 
    
    h += `</div>
        <div id="cal-events" class="mt-6 space-y-2"></div>
    </div>`;
    
    c.innerHTML = h; 
}

function changeMonth(delta) {
    currentCalDate.setDate(1);
    currentCalDate.setMonth(currentCalDate.getMonth() + delta);
    renderCalendar(document.getElementById('app'));
}

function filterDate(d) { 
    const list = state.events.filter(e => e.date === d || e.endDate === d); 
    const container = document.getElementById('cal-events');
    if(container) {
        container.innerHTML = list.length ? list.map(e => {
            const isEndDate = e.endDate === d;
            const isOverdue = isDateOverdue(e.endDate) && isEndDate;
            const isToday = isDateToday(e.endDate) && isEndDate;
            return `<div onclick="viewEvent('${e.id}')" class="bg-white p-3 mb-2 rounded border shadow-sm flex justify-between items-center ${isOverdue?'border-red-300 bg-red-50':(isToday?'border-green-300 bg-green-50':'')}">
                <div>
                    <span class="font-bold block">${e.client}</span>
                    <span class="text-[10px] text-gray-500">${isEndDate ? 'ফেরত: ' : 'শুরু: '}${formatDateWithDay(isEndDate ? e.endDate : e.date)}</span>
                </div>
                <div class="text-right">
                    <span class="text-xs border px-2 rounded block mb-1">${e.status}</span>
                    ${isOverdue?'<span class="text-[10px] text-red-600 font-bold">অতিক্রান্ত</span>':(isToday?'<span class="text-[10px] text-green-600 font-bold">আজ</span>':'')}
                </div>
            </div>`;
        }).join('') : '<p class="text-center text-gray-400 py-4">এই তারিখে কোন ইভেন্ট নেই</p>'; 
    }
}