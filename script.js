// Marca navegador Firefox para otimizações específicas de composição WebRender
if (/firefox/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-firefox');
}

// Custom Cursor Glow (composited via transform, sem layout/blend readback)
const cursor = document.getElementById('cursor-glow');
const supportsFinePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: fine)').matches
    : window.innerWidth > 768;

if (cursor && supportsFinePointer && window.innerWidth > 768) {
    let mouseX = -200;
    let mouseY = -200;
    let lastHovering = false;
    let cursorTarget = null;
    let cursorRafPending = false;

    const updateCursor = () => {
        cursorRafPending = false;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

        const isHovering = Boolean(
            cursorTarget &&
            typeof cursorTarget.closest === 'function' &&
            cursorTarget.closest('a, button, .card, .game-card')
        );

        if (isHovering !== lastHovering) {
            cursor.classList.toggle('is-hovering', isHovering);
            lastHovering = isHovering;
        }
    };

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorTarget = e.target;
        if (!cursorRafPending) {
            cursorRafPending = true;
            requestAnimationFrame(updateCursor);
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hovering');
        lastHovering = false;
        cursor.style.transform = 'translate3d(-200px, -200px, 0) translate(-50%, -50%)';
    }, { passive: true });
}

// Scroll Reveal Animation (desobserva após revelar para reduzir trabalho)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.12
};

const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            obs.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.hidden').forEach((el) => {
    observer.observe(el);
});

// Pausa vídeo da Hero e animação glitch quando fora da viewport (melhora fluidez ao rolar)
const heroSection = document.getElementById('hero');
const heroVideo = document.querySelector('.hero-video-bg');
if (heroSection && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            heroSection.classList.toggle('is-offscreen', !entry.isIntersecting);
            if (heroVideo) {
                if (entry.isIntersecting) {
                    const playPromise = heroVideo.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => {});
                    }
                } else {
                    heroVideo.pause();
                }
            }
        });
    }, { rootMargin: '20px 0px', threshold: 0 });
    heroObserver.observe(heroSection);
}

// Scroll unificado com rAF + listener passivo (sem mutações repetidas de layout na navbar)
const navbar = document.querySelector('.navbar');
const shape1 = document.querySelector('.shape-1');
const shape2 = document.querySelector('.shape-2');
const shape3 = document.querySelector('.shape-3');
const hasParallaxShapes = Boolean(shape1 || shape2 || shape3);

if (navbar || hasParallaxShapes) {
    let lastScrolled = null;
    let scrollRafPending = false;

    const onScrollFrame = () => {
        scrollRafPending = false;
        const scrollY = window.scrollY;

        if (navbar) {
            const isScrolled = scrollY > 50;
            if (isScrolled !== lastScrolled) {
                navbar.classList.toggle('scrolled', isScrolled);
                lastScrolled = isScrolled;
            }
        }

        if (hasParallaxShapes && window.innerWidth > 768) {
            if (shape1) shape1.style.transform = `translate3d(0, ${scrollY * 0.15}px, 0)`;
            if (shape2) shape2.style.transform = `translate3d(0, ${scrollY * -0.1}px, 0)`;
            if (shape3) shape3.style.transform = `translate3d(${scrollY * 0.05}px, ${scrollY * 0.05}px, 0)`;
        }
    };

    onScrollFrame();
    window.addEventListener('scroll', () => {
        if (!scrollRafPending) {
            scrollRafPending = true;
            requestAnimationFrame(onScrollFrame);
        }
    }, { passive: true });
}

// Trigger initial load animations
window.addEventListener('load', () => {
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('show');
    }, 100);
});

// Mobile Menu Logic
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

if (mobileMenu && navMenu) {
    mobileMenu.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = mobileMenu.querySelector('i');
        if (icon) {
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Close mobile menu when a link is clicked
    const navLinks = document.querySelectorAll('#nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                const icon = mobileMenu.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });
}
