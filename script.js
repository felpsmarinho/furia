// Custom Cursor Glow
const cursor = document.getElementById('cursor-glow');

if (window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    });

    // Interactive elements hover for cursor
    const interactiveElements = document.querySelectorAll('a, button, .card');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.width = '150px';
            cursor.style.height = '150px';
            cursor.style.opacity = '0.8';
            cursor.style.background = 'radial-gradient(circle, rgba(148, 7, 242, 0.8) 0%, transparent 60%)';
        });
        el.addEventListener('mouseleave', () => {
            cursor.style.width = '100px';
            cursor.style.height = '100px';
            cursor.style.opacity = '0.5';
            cursor.style.background = 'radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)';
        });
    });
}

// Scroll Reveal Animation
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, observerOptions);

document.querySelectorAll('.hidden').forEach((el) => {
    observer.observe(el);
});

// Parallax effect on scroll for shapes
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (window.innerWidth > 768) {
        requestAnimationFrame(() => {
            const shape1 = document.querySelector('.shape-1');
            const shape2 = document.querySelector('.shape-2');
            const shape3 = document.querySelector('.shape-3');
            
            if(shape1) shape1.style.transform = `translateY(${scrollY * 0.15}px)`;
            if(shape2) shape2.style.transform = `translateY(${scrollY * -0.1}px)`;
            if(shape3) shape3.style.transform = `translateY(${scrollY * 0.05}px) translateX(${scrollY * 0.05}px)`;
        });
    }
});

// Navbar background blur on scroll
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.padding = '15px 50px';
        navbar.style.background = 'rgba(8, 8, 10, 0.95)';
        navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
    } else {
        navbar.style.padding = '20px 50px';
        navbar.style.background = 'rgba(12, 12, 14, 0.8)';
        navbar.style.boxShadow = 'none';
    }
});

// Trigger initial load animations
window.addEventListener('load', () => {
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if(heroContent) heroContent.classList.add('show');
    }, 100);
});

// Mobile Menu Logic
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

if(mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = mobileMenu.querySelector('i');
        if(navMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });
}

// Close mobile menu when a link is clicked
const navLinks = document.querySelectorAll('#nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if(navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            const icon = mobileMenu.querySelector('i');
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });
});
