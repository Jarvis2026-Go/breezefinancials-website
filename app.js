// ============================================
// BREEZE FINANCIALS — App Logic
// ============================================

// CONFIG — Update Calendly URLs when you create separate event types
const CALENDLY = {
    discovery: 'https://calendly.com/rodrigomedeiros-breezefinancials/30min',
    strategy: 'https://calendly.com/rodrigomedeiros-breezefinancials/30min'
};

// ============================================
// MOBILE MENU
// ============================================
function toggleMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}
// Close mobile menu on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobileMenu');
    const btn = document.querySelector('.mobile-menu-btn');
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// ============================================
// FLOATING CTA — show on scroll
// ============================================
window.addEventListener('scroll', () => {
    const cta = document.getElementById('floatingCta');
    if (window.scrollY > 600) {
        cta.classList.add('visible');
    } else {
        cta.classList.remove('visible');
    }
});

// ============================================
// HERO FORM (Audit Request — 2-step)
// ============================================
let heroStep = 1;
let heroSubmitted = false;

function heroFormNext(from) {
    if (from === 1) {
        const name = v('hf-name'), email = v('hf-email');
        if (!name || !email) { markFields(['hf-name', 'hf-email']); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markField('hf-email'); return; }
    }
    if (from === 2) {
        if (heroSubmitted) return; // prevent double-submit
        const biz = v('hf-biz'), type = document.getElementById('hf-type').value;
        if (!biz || !type) { markFields(['hf-biz', 'hf-type']); return; }
        heroSubmitted = true;
        storeLead('audit-request', {
            name: v('hf-name'), email: v('hf-email'), phone: v('hf-phone'),
            business: v('hf-biz'), type: document.getElementById('hf-type').value,
            revenue: document.getElementById('hf-rev').value
        });
        if (typeof fbq === 'function') fbq('track', 'SubmitApplication');
    }
    heroStep = from + 1;
    updateHeroForm();
}

function heroFormBack() {
    heroStep = 1;
    updateHeroForm();
}

function updateHeroForm() {
    for (let i = 1; i <= 3; i++) {
        document.getElementById('hf-' + i).classList.toggle('active', i === heroStep);
        const tab = document.getElementById('hf-si-' + i);
        tab.className = 'hf-step' + (i === heroStep ? ' active' : i < heroStep ? ' done' : '');
    }
}

// ============================================
// BOOKING SECTION (Discovery/Strategy — 3-step + Calendly)
// ============================================
let bkStep = 1;
let callType = 'discovery';

function selectCallType(t) {
    callType = t;
    document.querySelectorAll('.call-card').forEach(c =>
        c.classList.toggle('selected', c.dataset.type === t));
    document.getElementById('bkTitle').textContent =
        t === 'discovery' ? 'Book Your Free Discovery Call' : 'Book Your Strategy Session';
    document.getElementById('bkSub').textContent =
        t === 'discovery'
            ? 'Takes about 60 seconds — helps our team prepare'
            : "Takes about 60 seconds — we'll review your info before we meet";
    if (bkStep === 3) loadCal();
}

function bkGo(to) {
    if (to > bkStep && !bkValidate(bkStep)) return;
    bkStep = to;
    for (let i = 1; i <= 4; i++)
        document.getElementById('bk-s' + i).classList.toggle('active', i === bkStep);
    for (let i = 1; i <= 3; i++) {
        const t = document.getElementById('bk-si-' + i);
        t.className = 'step-tab' + (i === bkStep ? ' active' : i < bkStep ? ' done' : '');
    }
    document.getElementById('bkSteps').classList.toggle('hidden', bkStep === 4);
    document.getElementById('bkTrust').classList.toggle('hidden', bkStep === 4);
    if (bkStep === 3) loadCal();
    document.getElementById('bookingPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bkValidate(s) {
    if (s === 1) {
        const fn = v('bk-fn'), ln = v('bk-ln'), em = v('bk-email');
        if (!fn || !ln || !em) { markFields(['bk-fn', 'bk-ln', 'bk-email']); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { markField('bk-email'); return false; }
        return true;
    }
    if (s === 2) {
        const biz = v('bk-biz'), ind = document.getElementById('bk-ind').value, rev = document.getElementById('bk-rev').value;
        if (!biz || !ind || !rev) { markFields(['bk-biz', 'bk-ind', 'bk-rev']); return false; }
        return true;
    }
    return true;
}

// ============================================
// CALENDLY EMBED
// ============================================
let calMessageHandler = null; // Track listener to prevent stacking

function loadCal() {
    const wrap = document.getElementById('calWrap');
    const load = document.getElementById('calLoad');
    const old = wrap.querySelector('.calendly-inline-widget');
    if (old) old.remove();
    load.style.display = 'block';

    // Remove previous listener if any
    if (calMessageHandler) {
        window.removeEventListener('message', calMessageHandler);
        calMessageHandler = null;
    }

    const pains = Array.from(document.querySelectorAll('#bk-pains .on')).map(c => c.dataset.value);
    const info = [
        'Business: ' + v('bk-biz') + ' (' + document.getElementById('bk-ind').value + ')',
        'Revenue: ' + document.getElementById('bk-rev').value,
        'Challenges: ' + (pains.join(', ') || 'Not specified'),
        v('bk-notes') ? 'Notes: ' + v('bk-notes') : ''
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
        name: v('bk-fn') + ' ' + v('bk-ln'),
        email: v('bk-email'),
        a1: info
    });
    if (v('bk-phone')) params.set('a2', v('bk-phone'));

    const url = CALENDLY[callType] + '?' + params + '&hide_gdpr_banner=1&hide_landing_page_details=1';
    const widget = document.createElement('div');
    widget.className = 'calendly-inline-widget';
    widget.style.cssText = 'width:100%;height:580px';
    widget.dataset.url = url;
    wrap.appendChild(widget);

    // Init with retry limit and fallback
    const init = (retries) => {
        retries = retries || 0;
        if (window.Calendly) {
            window.Calendly.initInlineWidget({ url, parentElement: widget });
            load.style.display = 'none';
        } else if (retries < 30) {
            setTimeout(() => init(retries + 1), 300);
        } else {
            // Fallback if Calendly fails to load (ad blocker, network issue)
            load.innerHTML = '<p style="color:var(--gray-600)">Could not load the calendar. <a href="' + CALENDLY[callType] + '" target="_blank" rel="noopener" style="color:var(--teal-600);font-weight:600">Click here to book directly &rarr;</a></p>';
        }
    };
    init(0);

    // Listen for scheduled event (with null guard)
    calMessageHandler = function(e) {
        if (e.data && e.data.event === 'calendly.event_scheduled') {
            window.removeEventListener('message', calMessageHandler);
            calMessageHandler = null;
            bkStep = 4;
            bkGo(4);
            storeLead('booked', {
                callType,
                firstName: v('bk-fn'), lastName: v('bk-ln'),
                email: v('bk-email'), phone: v('bk-phone'),
                referral: v('bk-ref'),
                business: v('bk-biz'), industry: document.getElementById('bk-ind').value,
                revenue: document.getElementById('bk-rev').value,
                painPoints: pains, notes: v('bk-notes')
            });
            if (typeof fbq === 'function') fbq('track', 'Schedule');
        }
    };
    window.addEventListener('message', calMessageHandler);
}

// ============================================
// CHECKBOX TOGGLE
// ============================================
function tog(el) { el.classList.toggle('on'); }

// ============================================
// FAQ TOGGLE
// ============================================
function faqTog(btn) {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
}

// ============================================
// LEAD MAGNET CAPTURE
// ============================================
function captureLead(e) {
    e.preventDefault();
    const email = document.getElementById('leadEmail').value.trim();
    if (!email) return;
    storeLead('lead-magnet', { email });
    document.getElementById('capArea').style.display = 'none';
    document.getElementById('emailOk').style.display = 'block';
    if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'Financial Health Snapshot' });
}

// ============================================
// LEAD DATA STORAGE
// ============================================
function storeLead(type, data) {
    const payload = { type, timestamp: new Date().toISOString(), ...data };

    // UNCOMMENT one of these to send data to your backend:

    // Option A: Zapier / Make.com webhook
    // fetch('https://hooks.zapier.com/hooks/catch/YOUR_ID/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });

    // Option B: Google Sheets via Apps Script
    // fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', { method:'POST', body:JSON.stringify(payload) });

    console.log('Lead captured:', payload);

    // Local backup
    try {
        const leads = JSON.parse(localStorage.getItem('breeze_leads') || '[]');
        leads.push(payload);
        localStorage.setItem('breeze_leads', JSON.stringify(leads));
    } catch (e) { /* noop */ }
}

// ============================================
// HELPERS
// ============================================
function v(id) { return (document.getElementById(id)?.value || '').trim(); }

function markFields(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!(el.value || '').trim()) markField(id);
    });
}

function markField(id) {
    const el = document.getElementById(id);
    el.style.boxShadow = '0 0 0 2px var(--red-500)';
    el.style.borderColor = 'transparent';
    const clear = () => { el.style.boxShadow = ''; el.style.borderColor = ''; };
    el.addEventListener('input', clear, { once: true });
    el.addEventListener('change', clear, { once: true });
}

// ============================================
// SMOOTH SCROLL for anchor links
// ============================================
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#') return; // skip bare hash to avoid querySelector crash
    try {
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        // invalid selector, ignore
    }
});
