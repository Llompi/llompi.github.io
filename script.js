// Modern Portfolio - Minimalist JavaScript
// No complex 3D animations or heavy dependencies

(function() {
    'use strict';

    // Mobile navigation functionality
    const initMobileNav = () => {
        const navToggle = document.getElementById('nav-toggle');
        const navMobile = document.getElementById('nav-mobile');
        
        navToggle?.addEventListener('click', () => {
            navMobile?.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on links
        document.querySelectorAll('.nav-mobile .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMobile?.classList.remove('active');
            });
        });
    };

    // Skills filter functionality
    const initSkillsFilter = () => {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const skillItems = document.querySelectorAll('.skill-item');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filter = button.dataset.filter;
                
                // Filter skills with smooth transition
                skillItems.forEach(item => {
                    if (filter === 'all' || item.dataset.category === filter) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    };

    // Smooth scrolling for navigation
    const initSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    const headerOffset = 70;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // Simple project interaction
    const initProjectCards = () => {
        const projectDetails = {
            'rf-amplifier': {
                title: 'RF Amplifier',
                description: 'High-fidelity RF amplifier for communication systems with advanced circuit simulation and PCB design following RF best practices.',
                technologies: ['Circuit Simulation', 'PCB Design', 'RF Analysis', 'Component Selection'],
                features: ['Signal Integrity', 'Impedance Matching', 'Low Noise Design']
            },
            'handheld-console': {
                title: 'Raspberry Pi Console',
                description: 'Custom handheld gaming console built with Raspberry Pi 4, featuring retro game emulation and ergonomic 3D printed enclosure.',
                technologies: ['Raspberry Pi 4', 'RetroPie OS', '3D Printing', 'Custom PCB'],
                features: ['5" IPS Display', '6 Hour Battery', 'Multi-System Emulation']
            },
            'iot-dispenser': {
                title: 'IoT Dog Treat Dispenser',
                description: 'Smart pet treat dispenser with mobile app control, automated scheduling, and remote monitoring capabilities for modern pet care.',
                technologies: ['ESP32', 'React Native', 'Wi-Fi', '3D Printing'],
                features: ['Remote Control', 'Scheduled Feeding', 'Portion Control']
            }
        };
        
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', function() {
                const project = this.dataset.project;
                const details = projectDetails[project];
                
                if (details) {
                    // Simple project details display (could be enhanced with modal later)
                    console.log(`Project: ${details.title}`, details);
                    
                    // For now, show basic info - in full implementation, this would open a detailed modal
                    alert(`${details.title}\n\n${details.description}\n\nTechnologies: ${details.technologies.join(', ')}`);
                }
            });
        });
    };

    // Intersection Observer for animations
    const initScrollAnimations = () => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe cards for staggered entrance animation
        document.querySelectorAll('.card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
            observer.observe(card);
        });
    };

    // Update current year
    const updateYear = () => {
        const currentYear = new Date().getFullYear();
        const yearElement = document.querySelector('.footer-copyright');
        if (yearElement) {
            yearElement.textContent = yearElement.textContent.replace(/\d{4}/, currentYear);
        }
    };

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        initMobileNav();
        initSkillsFilter();
        initSmoothScroll();
        initProjectCards();
        initScrollAnimations();
        updateYear();
    });

    // Handle window resize for responsive adjustments
    window.addEventListener('resize', () => {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768) {
            document.getElementById('nav-mobile')?.classList.remove('active');
        }
    });

})();