// ==========================================
    // 1. HELPER & UTILITY FUNCTIONS
    // ==========================================

    const $ = (q) => document.querySelector(q);
    const $$ = (q) => document.querySelectorAll(q);
    const $body = document.body;

    const client = (function () {
    let o = {
        browser: 'other',
        browserVersion: 0,
        os: 'other',
        osVersion: 0,
        mobile: false,
        canUse: null,
        flags: { lsdUnits: false },
    };
    let ua = navigator.userAgent, a, i;

    a = [
        ['firefox', /Firefox\/([0-9\.]+)/, null],
        ['edge', /Edge\/([0-9\.]+)/, null],
        ['safari', /Version\/([0-9\.]+).+Safari/, null],
        ['chrome', /Chrome\/([0-9\.]+)/, null],
        ['chrome', /CriOS\/([0-9\.]+)/, null],
        ['ie', /Trident\/.+rv:([0-9]+)/, null],
        ['safari', /iPhone OS ([0-9_]+)/, (v) => v.replace('_', '.').replace('_', '')],
    ];

    for (i = 0; i < a.length; i++) {
        if (ua.match(a[i][1])) {
        o.browser = a[i][0];
        o.browserVersion = parseFloat(a[i][2] ? a[i][2](RegExp.$1) : RegExp.$1);
        break;
        }
    }

    a = [
        ['ios', /([0-9_]+) like Mac OS X/, (v) => v.replace('_', '.').replace('_', '')],
        ['ios', /CPU like Mac OS X/, (v) => 0],
        ['ios', /iPad; CPU/, (v) => 0],
        ['android', /Android ([0-9\.]+)/, null],
        ['mac', /Macintosh.+Mac OS X ([0-9_]+)/, (v) => v.replace('_', '.').replace('_', '')],
        ['windows', /Windows NT ([0-9\.]+)/, null],
        ['undefined', /Undefined/, null],
    ];

    for (i = 0; i < a.length; i++) {
        if (ua.match(a[i][1])) {
        o.os = a[i][0];
        o.osVersion = parseFloat(a[i][2] ? a[i][2](RegExp.$1) : RegExp.$1);
        break;
        }
    }

    if (
        o.os === 'mac' &&
        'ontouchstart' in window &&
        ((screen.width === 1024 && screen.height === 1366) ||
        (screen.width === 834 && screen.height === 1112) ||
        (screen.width === 810 && screen.height === 1080) ||
        (screen.width === 768 && screen.height === 1024))
    ) {
        o.os = 'ios';
    }

    o.mobile = o.os === 'android' || o.os === 'ios';

    const _canUse = document.createElement('div');
    o.canUse = function (property, value) {
        let style = _canUse.style;
        if (!(property in style)) return false;
        if (typeof value !== 'undefined') {
        style[property] = value;
        if (style[property] === '') return false;
        }
        return true;
    };

    o.flags.lsdUnits = o.canUse('width', '100dvw');
    return o;
    })();

    const ready = {
    list: [],
    add: function (f) {
        this.list.push(f);
    },
    run: function () {
        this.list.forEach((f) => f());
    },
    };

    const escapeHtml = function (s) {
    if (s === '' || s === null || s === undefined) return '';
    const a = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return s.replace(/[&<>"']/g, (x) => a[x]);
    };

    const thisHash = function () {
    let h = location.hash ? location.hash.substring(1) : null;
    if (!h) return null;
    if (h.match(/\?/)) {
        let a = h.split('?');
        h = a[0];
        history.replaceState(undefined, undefined, '#' + h);
        window.location.search = a[1];
    }
    if (h.length > 0 && !h.match(/^[a-zA-Z]/)) h = 'x' + h;
    return typeof h === 'string' ? h.toLowerCase() : h;
    };

    const scrollToElement = function (e, style = 'smooth', duration = 750) {
    let y, offset;
    if (!e) {
        y = 0;
    } else {
        offset =
        (e.dataset.scrollOffset ? parseInt(e.dataset.scrollOffset) : 0) *
        parseFloat(getComputedStyle(document.documentElement).fontSize);

        switch (e.dataset.scrollBehavior || 'default') {
        case 'center':
            y =
            e.offsetHeight < window.innerHeight
                ? e.offsetTop - (window.innerHeight - e.offsetHeight) / 2 + offset
                : e.offsetTop - offset;
            break;
        case 'previous':
            y = e.previousElementSibling
            ? e.previousElementSibling.offsetTop + e.previousElementSibling.offsetHeight + offset
            : e.offsetTop + offset;
            break;
        case 'default':
        default:
            y = e.offsetTop + offset;
            break;
        }
    }

    if (style === 'instant') {
        window.scrollTo(0, y);
        return;
    }

    const start = Date.now();
    const cy = window.scrollY;
    const dy = y - cy;

    const easing = (t) => (style === 'linear' ? t : t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

    const step = function () {
        let t = Date.now() - start;
        if (t >= duration) {
        window.scroll(0, y);
        } else {
        window.scroll(0, cy + dy * easing(t / duration));
        requestAnimationFrame(step);
        }
    };
    step();
    };

    const loadElements = function (parent) {
    let a, e, x, i;
    $body.dispatchEvent(new CustomEvent('startComponents', { detail: { parent } }));

    a = parent.querySelectorAll('iframe[data-src]:not([data-src=""])');
    for (i = 0; i < a.length; i++) {
        x = a[i].cloneNode();
        x.setAttribute('src', x.dataset.src);
        x.dataset.initialSrc = x.dataset.src;
        x.dataset.src = '';
        a[i].replaceWith(x);
    }

    a = parent.querySelectorAll('video[autoplay]');
    for (i = 0; i < a.length; i++) {
        if (a[i].paused) a[i].play();
    }

    e = parent.querySelector('[data-autofocus="1"]');
    if (e && e.tagName === 'FORM') {
        let input = e.querySelector('.field input, .field select, .field textarea');
        if (input) input.focus();
    }

    a = parent.querySelectorAll('unloaded-script');
    for (i = 0; i < a.length; i++) {
        x = document.createElement('script');
        x.setAttribute('data-loaded', '');
        if (a[i].getAttribute('src')) x.setAttribute('src', a[i].getAttribute('src'));
        if (a[i].textContent) x.textContent = a[i].textContent;
        a[i].replaceWith(x);
    }

    x = new Event('loadelements');
    parent.querySelectorAll('[data-unloaded]').forEach((element) => {
        element.removeAttribute('data-unloaded');
        element.dispatchEvent(x);
    });
    };


    // ==========================================
    // 2. SCROLL EVENTS MANAGER
    // ==========================================

    const scrollEvents = {
    items: [],
    add: function (o) {
        this.items.push({
        element: o.element,
        triggerElement: o.triggerElement || o.element,
        enter: o.enter || null,
        leave: o.leave || null,
        mode: o.mode || 4,
        threshold: o.threshold || 0.25,
        offset: o.offset || 0,
        initialState: o.initialState || null,
        state: false,
        });
    },
    handler: function () {
        let height = document.documentElement.clientHeight;
        let top = client.os === 'ios' ? document.body.scrollTop + window.scrollY : document.documentElement.scrollTop;
        let bottom = top + height;
        let scrollPad = client.os === 'ios' ? 125 : 0;

        scrollEvents.items.forEach(function (item) {
        if (!item.enter && !item.leave) return;
        if (!item.triggerElement || item.triggerElement.offsetParent === null) {
            if (item.state === true && item.leave) {
            item.state = false;
            item.leave.apply(item.element);
            if (!item.enter) item.leave = null;
            }
            return;
        }

        let bcr = item.triggerElement.getBoundingClientRect();
        let elementTop = top + Math.floor(bcr.top);
        let elementBottom = elementTop + bcr.height;
        let state;

        if (item.initialState !== null) {
            state = item.initialState;
            item.initialState = null;
        } else {
            let a, b, pad, viewportTop, viewportBottom;
            switch (item.mode) {
            case 1:
                state = bottom > elementTop - item.offset && top < elementBottom + item.offset;
                break;
            case 2:
                a = top + height * 0.5;
                state = a > elementTop - item.offset && a < elementBottom + item.offset;
                break;
            case 3:
                a = top + height * item.threshold;
                if (a - height * 0.375 <= 0) a = 0;
                b = top + height * (1 - item.threshold);
                if (b + height * 0.375 >= document.body.scrollHeight - scrollPad) {
                b = document.body.scrollHeight + scrollPad;
                }
                state = b > elementTop - item.offset && a < elementBottom + item.offset;
                break;
            case 4:
            default:
                pad = height * item.threshold;
                viewportTop = top + pad;
                viewportBottom = bottom - pad;
                if (Math.floor(top) <= pad) viewportTop = top;
                if (Math.ceil(bottom) >= document.body.scrollHeight - pad) viewportBottom = bottom;

                if (viewportBottom - viewportTop >= elementBottom - elementTop) {
                state =
                    (elementTop >= viewportTop && elementBottom <= viewportBottom) ||
                    (elementTop >= viewportTop && elementTop <= viewportBottom) ||
                    (elementBottom >= viewportTop && elementBottom <= viewportBottom);
                } else {
                state =
                    (viewportTop >= elementTop && viewportBottom <= elementBottom) ||
                    (elementTop >= viewportTop && elementTop <= viewportBottom) ||
                    (elementBottom >= viewportTop && elementBottom <= viewportBottom);
                }
                break;
            }
        }

        if (state !== item.state) {
            item.state = state;
            if (item.state) {
            if (item.enter) {
                item.enter.apply(item.element);
                if (!item.leave) item.enter = null;
            }
            } else {
            if (item.leave) {
                item.leave.apply(item.element);
                if (!item.enter) item.leave = null;
            }
            }
        }
        });
    },
    init: function () {
        addEventListener('load', this.handler);
        addEventListener('resize', this.handler);
        addEventListener('scroll', this.handler);
        this.handler();
    },
    };


    // ==========================================
    // 3. ON-VISIBLE ANIMATION CONTROLLER
    // ==========================================

    const onvisible = {
    effects: {
        'fade-in': {
        type: 'transition',
        transition: (speed, delay) => `opacity ${speed}s ease${delay ? ' ' + delay + 's' : ''}`,
        rewind: function () { this.style.opacity = 0; },
        play: function () { this.style.opacity = 1; },
        },
    },
    add: function (selector, settings) {
        const style = settings.style in this.effects ? settings.style : 'fade';
        const speed = parseInt(settings.speed || 0);
        const intensity = parseInt(settings.intensity || 5);
        const delay = parseInt(settings.delay || 0);
        const replay = settings.replay || false;
        const effect = this.effects[style];

        if (window.CARRD_DISABLE_ANIMATION === true) return;

        let enter = function () {
        let orig = this.style.transition;
        this.style.setProperty('backface-visibility', 'hidden');
        this.style.transition = effect.transition.apply(this, [speed / 1000, delay / 1000]);
        effect.play.apply(this);
        setTimeout(() => {
            this.style.removeProperty('backface-visibility');
            this.style.transition = orig;
        }, (speed + delay) * 2);
        };

        let leave = function () {
        let orig = this.style.transition;
        this.style.setProperty('backface-visibility', 'hidden');
        this.style.transition = effect.transition.apply(this, [speed / 1000]);
        effect.rewind.apply(this);
        setTimeout(() => {
            this.style.removeProperty('backface-visibility');
            this.style.transition = orig;
        }, speed * 2);
        };

        $$(selector).forEach((e) => {
        effect.rewind.apply(e);
        scrollEvents.add({
            element: e,
            triggerElement: e,
            initialState: null,
            threshold: 0.25,
            enter: enter,
            leave: replay ? leave : null,
        });
        });
    },
    };


    // ==========================================
    // 4. LIGHTBOX GALLERY
    // ==========================================

    function lightboxGallery() {
    this.id = 'gallery';
    this.$modal = null;
    this.$modalCaption = null;
    this.$modalImage = null;
    this.$modalNext = null;
    this.$modalPrevious = null;
    this.$links = null;
    this.locked = false;
    this.captions = null;
    this.current = null;
    this.delay = 375;
    this.navigation = null;
    this.mobile = null;
    this.protect = null;
    this.zoomIntervalId = null;
    this.initModal();
    }

    lightboxGallery.prototype.init = function (config) {
    const _this = this;
    const $links = $$('#' + config.id + ' .thumbnail');
    let count = 0;

    for (let i = 0; i < $links.length; i++) {
        if ($links[i].dataset.lightboxIgnore !== '1') count++;
    }
    let navigation = count < 2 ? false : config.navigation;

    for (let i = 0; i < $links.length; i++) {
        if ($links[i].dataset.lightboxIgnore === '1') continue;
        $links[i].addEventListener('click', function (event) {
        event.stopPropagation();
        event.preventDefault();
        _this.show(i, {
            $links: $links,
            navigation: navigation,
            captions: config.captions,
            mobile: config.mobile,
            mobileNavigation: config.mobileNavigation,
            scheme: config.scheme,
            protect: config.protect || false,
        });
        });
    }
    };

    lightboxGallery.prototype.initModal = function () {
    const _this = this;
    let dragStart = null;
    let dragEnd = null;

    const $modal = document.createElement('div');
    $modal.id = this.id + '-component-modal';
    $modal.tabIndex = -1;
    $modal.className = 'gallery-component-modal';
    $modal.innerHTML = `
        <div class="inner"><img src="" /></div>
        <div class="caption"></div>
        <div class="nav previous"></div>
        <div class="nav next"></div>
        <div class="close"></div>
    `;
    $body.appendChild($modal);

    const $modalInner = $modal.querySelector('.inner');
    const $modalImage = $modal.querySelector('img');
    const $modalCaption = $modal.querySelector('.caption');
    const $modalNext = $modal.querySelector('.next');
    const $modalPrevious = $modal.querySelector('.previous');

    $modalImage.addEventListener('load', function () {
        $modalImage.style.setProperty('--natural-width', $modalImage.naturalWidth + 'px');
        $modalImage.style.setProperty('--natural-height', $modalImage.naturalHeight + 'px');
        $modal.classList.add('done');
        setTimeout(() => {
        if (!$modal.classList.contains('visible')) return;
        $modal.classList.add('loaded');
        setTimeout(() => {
            $modal.classList.remove('switching', 'from-left', 'from-right', 'done');
        }, _this.delay);
        }, $modal.classList.contains('switching') ? 0 : _this.delay);
    });

    $modalImage.addEventListener('contextmenu', (e) => { if (_this.protect) e.preventDefault(); }, true);
    $modalImage.addEventListener('dragstart', (e) => { if (_this.protect) e.preventDefault(); }, true);

    $modal.show = function (index, offset, direction) {
        if (_this.locked) return;
        if (typeof index !== 'number') index = _this.current;

        if (typeof offset === 'number') {
        let found = false;
        for (let j = 0; j < _this.$links.length; j++) {
            index += offset;
            if (index < 0) index = _this.$links.length - 1;
            else if (index >= _this.$links.length) index = 0;
            if (index === _this.current) break;

            let item = _this.$links.item(index);
            if (item && item.dataset.lightboxIgnore !== '1') {
            found = true;
            break;
            }
        }
        if (!found) return;
        } else {
        if (index < 0) index = _this.$links.length - 1;
        else if (index >= _this.$links.length) index = 0;
        if (index === _this.current) return;
        }

        let item = _this.$links.item(index);
        if (!item || item.dataset.lightboxIgnore === '1') return;

        if (client.mobile) {
        _this.zoomIntervalId = setInterval(() => _this.zoomHandler(), 250);
        }
        _this.locked = true;

        if (_this.current !== null) {
        $modal.classList.remove('loaded');
        $modal.classList.add('switching');
        if (direction === -1) $modal.classList.add('from-left');
        if (direction === 1) $modal.classList.add('from-right');

        setTimeout(() => {
            _this.current = index;
            $modalImage.src = item.href;
            if (_this.captions) $modalCaption.innerHTML = item.querySelector('[data-caption]').dataset.caption;
            setTimeout(() => {
            $modal.focus();
            _this.locked = false;
            }, _this.delay);
        }, _this.delay);
        } else {
        _this.current = index;
        $modalImage.src = item.href;
        if (_this.captions) $modalCaption.innerHTML = item.querySelector('[data-caption]').dataset.caption;
        $modal.classList.add('visible');
        setTimeout(() => {
            $modal.focus();
            _this.locked = false;
        }, _this.delay);
        }
    };

    $modal.hide = function () {
        if (_this.locked || !$modal.classList.contains('visible')) return;
        _this.locked = true;
        $modal.classList.remove('visible', 'loaded', 'switching', 'from-left', 'from-right', 'done');
        clearInterval(_this.zoomIntervalId);
        setTimeout(() => {
        $modalImage.src = '';
        _this.locked = false;
        $body.focus();
        _this.current = null;
        }, _this.delay);
    };

    $modal.next = (dir) => $modal.show(null, 1, dir);
    $modal.previous = (dir) => $modal.show(null, -1, dir);

    $modalInner.addEventListener('touchstart', (e) => {
        if (_this.navigation && e.touches.length === 1) {
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });

    $modalInner.addEventListener('touchmove', (e) => {
        if (!_this.navigation || !dragStart || e.touches.length > 1) return;
        dragEnd = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        let dx = dragStart.x - dragEnd.x;
        if (Math.abs(dx) < 50) return;
        e.preventDefault();
        dx > 0 ? $modal.next(-1) : $modal.previous(1);
    });

    $modalInner.addEventListener('touchend', () => {
        dragStart = null;
        dragEnd = null;
    });

    $modal.addEventListener('click', (e) => {
        if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'SPOILER-TEXT')) return;
        $modal.hide();
    });

    $modal.addEventListener('keydown', (e) => {
        if (!$modal.classList.contains('visible')) return;
        switch (e.keyCode) {
        case 39:
        case 32:
            if (_this.navigation) { e.preventDefault(); $modal.next(); }
            break;
        case 37:
            if (_this.navigation) { e.preventDefault(); $modal.previous(); }
            break;
        case 27:
            e.preventDefault();
            $modal.hide();
            break;
        }
    });

    $modalNext.addEventListener('click', () => $modal.next());
    $modalPrevious.addEventListener('click', () => $modal.previous());

    this.$modal = $modal;
    this.$modalImage = $modalImage;
    this.$modalCaption = $modalCaption;
    this.$modalNext = $modalNext;
    this.$modalPrevious = $modalPrevious;
    };

    lightboxGallery.prototype.show = function (href, config) {
    this.$links = config.$links;
    this.navigation = config.navigation;
    this.captions = config.captions;
    this.protect = config.protect;

    this.$modal.classList.remove('light', 'dark');
    if (config.scheme === 'light' || (config.scheme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
        this.$modal.classList.add('light');
    } else {
        this.$modal.classList.add('dark');
    }

    this.$modalNext.style.display = this.navigation && (!client.mobile || config.mobileNavigation) ? '' : 'none';
    this.$modalPrevious.style.display = this.navigation && (!client.mobile || config.mobileNavigation) ? '' : 'none';
    this.$modalCaption.style.display = this.captions ? '' : 'none';

    if (client.mobile && !config.mobile) return;
    this.$modal.show(href);
    };

    lightboxGallery.prototype.zoomHandler = function () {
    let threshold = window.matchMedia('(orientation: portrait)').matches ? 50 : 100;
    if (window.outerWidth > window.innerWidth + threshold) {
        this.$modal.classList.add('zooming');
    } else {
        this.$modal.classList.remove('zooming');
    }
    };


    // ==========================================
    // 5. EVENT LISTENERS & INITIALIZATION
    // ==========================================

    // Email Contact Button Listener
    document.querySelectorAll('.contact-email').forEach((button) => {
    button.addEventListener('click', (event) => {
        event.preventDefault();
        const user = "sducheneaut";
        const domain = "gmail.com";
        const subject = encodeURIComponent("Commission Inquiry");
        window.location.href = `mailto:${user}@${domain}?subject=${subject}`;
    });
    });

    // Page Load Handler
    addEventListener('load', () => {
    setTimeout(() => {
        $body.classList.remove('is-loading');
        $body.classList.add('is-playing');
        setTimeout(() => {
        $body.classList.remove('is-playing');
        $body.classList.add('is-ready');
        }, 2000);
    }, 100);

    let h = thisHash();
    let initialScrollPoint = $('[data-scroll-id="' + h + '"]');
    if (initialScrollPoint) scrollToElement(initialScrollPoint, 'instant');
    });

    // Smooth Scroll Links Setup
    addEventListener('click', (event) => {
    let t = event.target;
    while (t && t.tagName !== 'A') t = t.parentElement;
    if (t && t.getAttribute('href')?.startsWith('#')) {
        let scrollPoint = $('[data-scroll-id="' + t.hash.substr(1) + '"]');
        if (scrollPoint) {
        event.preventDefault();
        scrollToElement(scrollPoint, 'smooth');
        }
    }
    });

    // Execute Gallery and Component Animations
    loadElements(document.body);
    scrollEvents.init();

    const _lightboxGallery = new lightboxGallery();
    _lightboxGallery.init({
    id: 'gallery01',
    navigation: true,
    captions: true,
    mobile: true,
    mobileNavigation: true,
    scheme: 'dark',
    protect: true,
    });

    // Attach On-Visible Animations
    [
    '.text-component.instance-3',
    '.text-component.instance-4',
    '.icons-component.instance-1',
    '.buttons-component.instance-2',
    '.container-component.instance-3',
    '.container-component.instance-2',
    '.container-component.instance-1',
    '.container-component.instance-4',
    '.container-component.instance-6',
    '.container-component.instance-5',
    '.icons-component.instance-2',
    '.buttons-component.instance-1',
    ].forEach((selector) => {
    onvisible.add(selector, { style: 'fade-in', speed: 1000, intensity: 5, threshold: 3, delay: 0, replay: false });
    });

    ready.run();