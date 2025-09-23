// Enhanced Portfolio JavaScript with Touch Gestures and Fixed Robotic Arm

// Global Variables
let scene, camera, renderer, controls;
let backgroundModels = [];
let reflectorObjects = [];

// Enhanced robotic arm variables
let roboticArmGroup;
let armSegments = [];
let armAnimationId = null;
let isAnimating = false;

// Enhanced carousel instances
const carouselInstances = new Map();

// Touch gesture handling
class TouchGestureHandler {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            threshold: 50,
            velocity: 0.3,
            ...options
        };
        
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.startTime = 0;
        this.isTracking = false;
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Touch events
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse events for desktop
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.element.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }
    
    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        this.startTouch(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (!this.isTracking || e.touches.length !== 1) return;
        
        this.updateTouch(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.isTracking) return;
        
        this.endTouch();
        e.preventDefault();
    }
    
    handleMouseDown(e) {
        this.startTouch(e.clientX, e.clientY);
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (!this.isTracking) return;
        
        this.updateTouch(e.clientX, e.clientY);
    }
    
    handleMouseUp(e) {
        if (!this.isTracking) return;
        
        this.endTouch();
    }
    
    startTouch(x, y) {
        this.startX = x;
        this.startY = y;
        this.currentX = x;
        this.currentY = y;
        this.startTime = Date.now();
        this.isTracking = true;
        
        this.element.style.transition = 'none';
    }
    
    updateTouch(x, y) {
        this.currentX = x;
        this.currentY = y;
        
        const deltaX = this.currentX - this.startX;
        
        if (this.options.onMove) {
            this.options.onMove(deltaX);
        }
    }
    
    endTouch() {
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        const deltaTime = Date.now() - this.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        this.isTracking = false;
        this.element.style.transition = '';
        
        // Determine swipe direction and trigger callback
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.options.threshold) {
            if (deltaX > 0 && this.options.onSwipeRight) {
                this.options.onSwipeRight(velocity);
            } else if (deltaX < 0 && this.options.onSwipeLeft) {
                this.options.onSwipeLeft(velocity);
            }
        }
        
        if (this.options.onEnd) {
            this.options.onEnd();
        }
    }
}

// Enhanced Carousel Class
class EnhancedCarousel {
    constructor(carouselId) {
        this.carouselId = carouselId;
        this.carousel = document.getElementById(`${carouselId}-carousel`);
        if (!this.carousel) return;
        
        this.container = this.carousel.querySelector('.enhanced-carousel-container');
        this.slides = this.carousel.querySelectorAll('.enhanced-carousel-slide');
        this.indicators = this.carousel.querySelector('.enhanced-carousel-indicators');
        
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;
        
        this.init();
    }
    
    init() {
        this.createIndicators();
        this.updateCarousel(false);
        this.setupTouchGestures();
        this.setupKeyboardNavigation();
        
        // Auto-hide navigation on mobile
        if (window.innerWidth <= 768) {
            this.carousel.classList.add('mobile-carousel');
        }
    }
    
    createIndicators() {
        if (!this.indicators || this.totalSlides <= 1) return;
        
        this.indicators.innerHTML = '';
        
        for (let i = 0; i < this.totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `enhanced-carousel-dot ${i === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => this.goToSlide(i));
            this.indicators.appendChild(dot);
        }
    }
    
    setupTouchGestures() {
        if (!this.container) return;
        
        this.touchHandler = new TouchGestureHandler(this.carousel, {
            threshold: 50,
            onMove: (deltaX) => {
                const translateX = (-this.currentSlide * 100) + (deltaX / this.carousel.offsetWidth * 100);
                this.container.style.transform = `translateX(${Math.max(-100 * (this.totalSlides - 1), Math.min(0, translateX))}%)`;
            },
            onSwipeLeft: () => this.nextSlide(),
            onSwipeRight: () => this.prevSlide(),
            onEnd: () => {
                this.updateCarousel(true);
            }
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevSlide();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'Escape':
                    e.preventDefault();
                    closeModal(this.carouselId.replace('-carousel', ''));
                    break;
            }
        });
    }
    
    isVisible() {
        const modal = this.carousel.closest('.modal');
        return modal && modal.style.display === 'block';
    }
    
    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.updateCarousel(true);
    }
    
    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.updateCarousel(true);
    }
    
    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.currentSlide = index;
            this.updateCarousel(true);
        }
    }
    
    updateCarousel(animate = true) {
        if (!this.container) return;
        
        const translateX = -this.currentSlide * 100;
        
        if (animate) {
            this.container.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        } else {
            this.container.style.transition = 'none';
        }
        
        this.container.style.transform = `translateX(${translateX}%)`;
        
        // Update indicators
        if (this.indicators) {
            const dots = this.indicators.querySelectorAll('.enhanced-carousel-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.currentSlide);
            });
        }
        
        // Reset transition after animation
        if (animate) {
            setTimeout(() => {
                if (this.container) {
                    this.container.style.transition = '';
                }
            }, 400);
        }
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    init3DBackgroundScene();
    initSmoothScrolling();
    initMobileMenu();
    initEnhancedProjectModel1();
    setupSkillFiltering();
    observeSkillsSection();
    showAndHideHints();
    setCurrentYear();
    handleSafeAreaAdjustments();
});

function setCurrentYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

function handleSafeAreaAdjustments() {
    // Detect iPhone and apply safe area classes
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    
    if (isIOS || isStandalone) {
        document.body.classList.add('ios-device');
    }
    
    // Handle viewport changes (orientation, keyboard)
    window.addEventListener('resize', () => {
        // Trigger a repaint to handle safe areas
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';
    });
}

// 3D Background Scene with Improved Performance
function init3DBackgroundScene() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x331700);
    scene.fog = new THREE.FogExp2(0x4A2C17, 0.002);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    // Warm lighting
    scene.add(new THREE.AmbientLight(0x331700, 0.4));
    const dirLight = new THREE.DirectionalLight(0xFF9A00, 0.8);
    dirLight.position.set(5, 5, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const pointLight1 = new THREE.PointLight(0xFF5F6D, 0.6, 80);
    pointLight1.position.set(-10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xFFB347, 0.6, 80);
    pointLight2.position.set(10, -10, -10);
    scene.add(pointLight2);

    createFloatingGeometries();
    createReflectiveElements();

    window.addEventListener('resize', onWindowResize);
    animateBackground();
}

function createFloatingGeometries() {
    const geometryTypes = [
        () => new THREE.IcosahedronGeometry(2.5, 0),
        () => new THREE.TorusKnotGeometry(2, 0.6, 64, 8), // Reduced complexity
        () => new THREE.OctahedronGeometry(2.5, 0),
        () => new THREE.TorusGeometry(2.5, 0.8, 8, 16), // Reduced complexity
        () => new THREE.DodecahedronGeometry(2.5, 0),
    ];
    
    const materials = [
        new THREE.MeshPhongMaterial({ 
            color: 0xFF9A00, 
            shininess: 100, 
            specular: 0x444444, 
            transparent: true, 
            opacity: 0.7,
            emissive: 0xFF4500,
            emissiveIntensity: 0.1
        }),
        new THREE.MeshPhongMaterial({ 
            color: 0xFF5F6D, 
            shininess: 100, 
            specular: 0x444444, 
            transparent: true, 
            opacity: 0.7,
            emissive: 0xFF1744,
            emissiveIntensity: 0.1
        }),
        new THREE.MeshPhongMaterial({ 
            color: 0xFFB347, 
            shininess: 80, 
            specular: 0x333333, 
            transparent: true, 
            opacity: 0.6,
            emissive: 0xFFAB40,
            emissiveIntensity: 0.05
        }),
        new THREE.MeshStandardMaterial({ 
            color: 0xFF8A65, 
            roughness: 0.3, 
            metalness: 0.2, 
            transparent: true, 
            opacity: 0.75,
            emissive: 0xE64A19,
            emissiveIntensity: 0.1
        })
    ];

    for (let i = 0; i < 6; i++) { // Reduced from 8 to 6 for better performance
        const geometry = geometryTypes[i % geometryTypes.length]();
        const material = materials[i % materials.length].clone();
        const mesh = new THREE.Mesh(geometry, material);
        const range = 50;
        mesh.position.set(
            (Math.random() - 0.5) * range, 
            (Math.random() - 0.5) * range, 
            (Math.random() - 0.5) * range
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const scale = 0.6 + Math.random() * 0.6;
        mesh.scale.set(scale, scale, scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            rotationSpeed: { 
                x: (Math.random() - 0.5) * 0.008, 
                y: (Math.random() - 0.5) * 0.008 
            },
            direction: new THREE.Vector3(
                (Math.random()-0.5), 
                (Math.random()-0.5), 
                (Math.random()-0.5)
            ).normalize(),
            speed: 0.01 + Math.random() * 0.02,
            pulsePhase: Math.random() * Math.PI * 2
        };
        scene.add(mesh);
        backgroundModels.push(mesh);
    }
}

function createReflectiveElements() {
    try {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        if (THREE.Reflector) {
            const floorMirror = new THREE.Reflector(floorGeometry, {
                clipBias: 0.003,
                textureWidth: Math.min(window.innerWidth * window.devicePixelRatio, 1024),
                textureHeight: Math.min(window.innerHeight * window.devicePixelRatio, 1024),
                color: 0x332211,
                recursion: 1
            });
            floorMirror.position.y = -20;
            floorMirror.rotateX(-Math.PI / 2);
            scene.add(floorMirror);
            reflectorObjects.push(floorMirror);
        } else {
            throw new Error('Reflector not available');
        }
    } catch (error) {
        console.log('Reflector not available, using standard material');
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4A2C17, 
            transparent: true, 
            opacity: 0.3 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -20;
        floor.rotateX(-Math.PI / 2);
        scene.add(floor);
    }
}

function animateBackground() {
    requestAnimationFrame(animateBackground);
    
    const time = Date.now() * 0.001;
    
    backgroundModels.forEach((model, index) => {
        model.rotation.x += model.userData.rotationSpeed.x;
        model.rotation.y += model.userData.rotationSpeed.y;
        model.position.addScaledVector(model.userData.direction, model.userData.speed);
        
        const pulse = Math.sin(time + model.userData.pulsePhase) * 0.1 + 0.9;
        model.material.opacity = pulse * 0.7;
        
        const boundary = 35;
        if (Math.abs(model.position.x) > boundary || Math.abs(model.position.y) > boundary || Math.abs(model.position.z) > boundary) {
            if(Math.abs(model.position.x) > boundary) model.userData.direction.x *= -1;
            if(Math.abs(model.position.y) > boundary) model.userData.direction.y *= -1;
            if(Math.abs(model.position.z) > boundary) model.userData.direction.z *= -1;
            model.position.clampScalar(-boundary + 1, boundary - 1);
        }
    });
    
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#') && !this.onclick) {
                const targetElement = document.querySelector(hrefAttribute);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                    }
                }
            }
        });
    });
}

function initMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }
}

// Fixed Enhanced Robotic Arm Model
function initEnhancedProjectModel1() {
    const container = document.getElementById('project-model-1');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) {
        // Retry after a short delay if container isn't ready
        setTimeout(() => initEnhancedProjectModel1(), 100);
        return;
    }

    const project1Scene = new THREE.Scene();
    const project1Camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    project1Camera.position.set(15, 15, 25);

    const project1Renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    project1Renderer.setSize(width, height);
    project1Renderer.shadowMap.enabled = true;
    project1Renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    project1Renderer.setClearColor(0x000000, 0);
    container.appendChild(project1Renderer.domElement);

    // Enhanced lighting for better visibility
    project1Scene.add(new THREE.AmbientLight(0x4A2C17, 0.6));
    
    const dirLight = new THREE.DirectionalLight(0xFF9A00, 1.2);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    project1Scene.add(dirLight);
    
    const pointLight = new THREE.PointLight(0xFFB347, 0.8, 100);
    pointLight.position.set(-10, 10, 10);
    project1Scene.add(pointLight);

    // Create enhanced materials
    const baseMat = new THREE.MeshStandardMaterial({ 
        color: 0x2C1810, 
        metalness: 0.8, 
        roughness: 0.3,
        emissive: 0x1A0F08,
        emissiveIntensity: 0.1
    });
    
    const armMat = new THREE.MeshStandardMaterial({ 
        color: 0xFF8A65, 
        metalness: 0.6, 
        roughness: 0.4,
        emissive: 0xB8693A,
        emissiveIntensity: 0.05
    });
    
    const jointMat = new THREE.MeshStandardMaterial({ 
        color: 0x4A2C17, 
        metalness: 0.9, 
        roughness: 0.2,
        emissive: 0x2A1C0F,
        emissiveIntensity: 0.08
    });
    
    const endEffectorMat = new THREE.MeshStandardMaterial({ 
        color: 0xFF5F6D, 
        metalness: 0.7, 
        roughness: 0.3,
        emissive: 0xB8434C,
        emissiveIntensity: 0.1
    });

    // Create robotic arm group
    roboticArmGroup = new THREE.Group();
    armSegments = [];

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(4, 5, 2, 16);
    const base = new THREE.Mesh(baseGeometry, baseMat);
    base.position.y = 1;
    base.castShadow = true;
    base.receiveShadow = true;
    roboticArmGroup.add(base);

    // Base rotation joint
    const baseJointGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
    const baseJoint = new THREE.Mesh(baseJointGeometry, jointMat);
    baseJoint.position.y = 2.5;
    baseJoint.castShadow = true;
    roboticArmGroup.add(baseJoint);
    armSegments.push({ mesh: baseJoint, axis: 'y', speed: 1.0, baseRotation: 0 });

    // First arm segment
    const arm1Geometry = new THREE.BoxGeometry(1.5, 8, 1.5);
    const arm1 = new THREE.Mesh(arm1Geometry, armMat);
    arm1.position.set(0, 7, 0);
    arm1.castShadow = true;
    roboticArmGroup.add(arm1);
    armSegments.push({ mesh: arm1, axis: 'z', speed: 0.8, baseRotation: 0 });

    // Elbow joint
    const elbowJointGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const elbowJoint = new THREE.Mesh(elbowJointGeometry, jointMat);
    elbowJoint.position.set(0, 11, 0);
    elbowJoint.castShadow = true;
    roboticArmGroup.add(elbowJoint);
    armSegments.push({ mesh: elbowJoint, axis: 'x', speed: 1.2, baseRotation: 0 });

    // Second arm segment
    const arm2Geometry = new THREE.BoxGeometry(1.2, 6, 1.2);
    const arm2 = new THREE.Mesh(arm2Geometry, armMat);
    arm2.position.set(0, 14, 0);
    arm2.castShadow = true;
    roboticArmGroup.add(arm2);
    armSegments.push({ mesh: arm2, axis: 'z', speed: -1.0, baseRotation: 0 });

    // Wrist joint
    const wristJointGeometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 12);
    const wristJoint = new THREE.Mesh(wristJointGeometry, jointMat);
    wristJoint.position.set(0, 17.5, 0);
    wristJoint.castShadow = true;
    roboticArmGroup.add(wristJoint);
    armSegments.push({ mesh: wristJoint, axis: 'y', speed: 1.5, baseRotation: 0 });

    // End effector/gripper
    const gripperBaseGeometry = new THREE.BoxGeometry(1, 2, 1);
    const gripperBase = new THREE.Mesh(gripperBaseGeometry, endEffectorMat);
    gripperBase.position.set(0, 19, 0);
    gripperBase.castShadow = true;
    roboticArmGroup.add(gripperBase);

    // Gripper fingers
    const fingerGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.8);
    const finger1 = new THREE.Mesh(fingerGeometry, endEffectorMat);
    finger1.position.set(0.7, 19, 0);
    finger1.castShadow = true;
    roboticArmGroup.add(finger1);
    armSegments.push({ mesh: finger1, axis: 'x', speed: 2.0, baseRotation: 0 });

    const finger2 = new THREE.Mesh(fingerGeometry, endEffectorMat);
    finger2.position.set(-0.7, 19, 0);
    finger2.castShadow = true;
    roboticArmGroup.add(finger2);
    armSegments.push({ mesh: finger2, axis: 'x', speed: -2.0, baseRotation: 0 });

    // Additional details
    for(let i = 0; i < 3; i++) {
        const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const cylinder = new THREE.Mesh(cylinderGeometry, jointMat);
        cylinder.position.set(
            Math.cos(i * 2.09) * 2, 
            4 + i * 3, 
            Math.sin(i * 2.09) * 2
        );
        cylinder.castShadow = true;
        roboticArmGroup.add(cylinder);
    }

    project1Scene.add(roboticArmGroup);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x1A0F08, 
        transparent: true, 
        opacity: 0.8 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    project1Scene.add(ground);

    const project1Controls = new THREE.OrbitControls(project1Camera, project1Renderer.domElement);
    project1Controls.target.set(0, 10, 0);
    project1Controls.enableDamping = true;
    project1Controls.dampingFactor = 0.1;
    project1Controls.update();

    // Animation function
    function animateRoboticArm() {
        requestAnimationFrame(animateRoboticArm);
        
        if (isAnimating) {
            const time = Date.now() * 0.001;
            armSegments.forEach((segment, index) => {
                const amplitude = 0.3 + (index * 0.05);
                const frequency = segment.speed * 0.01;
                const rotation = Math.sin(time * frequency) * amplitude;
                
                if (segment.axis === 'x') {
                    segment.mesh.rotation.x = rotation;
                } else if (segment.axis === 'y') {
                    segment.mesh.rotation.y = rotation;
                } else if (segment.axis === 'z') {
                    segment.mesh.rotation.z = rotation;
                }
            });
        }
        
        project1Controls.update();
        project1Renderer.render(project1Scene, project1Camera);
    }
    
    animateRoboticArm();

    // Control buttons with improved functionality
    const animateBtn = document.getElementById('arm-animate');
    const resetBtn = document.getElementById('arm-reset');
    
    if (animateBtn) {
        animateBtn.addEventListener('click', () => {
            isAnimating = !isAnimating;
            animateBtn.textContent = isAnimating ? 'Stop' : 'Animate';
            animateBtn.classList.toggle('active', isAnimating);
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            isAnimating = false;
            if (animateBtn) {
                animateBtn.textContent = 'Animate';
                animateBtn.classList.remove('active');
            }
            
            // Reset all rotations smoothly
            armSegments.forEach(segment => {
                // Store current rotation
                const currentRotation = {
                    x: segment.mesh.rotation.x,
                    y: segment.mesh.rotation.y,
                    z: segment.mesh.rotation.z
                };
                
                // Animate to zero
                const duration = 1000; // 1 second
                const startTime = Date.now();
                
                function resetAnimation() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                    
                    segment.mesh.rotation.x = currentRotation.x * (1 - easeProgress);
                    segment.mesh.rotation.y = currentRotation.y * (1 - easeProgress);
                    segment.mesh.rotation.z = currentRotation.z * (1 - easeProgress);
                    
                    if (progress < 1) {
                        requestAnimationFrame(resetAnimation);
                    }
                }
                
                resetAnimation();
            });
            
            // Reset camera position
            project1Controls.reset();
        });
    }

    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width: newWidth, height: newHeight } = entry.contentRect;
            if (newWidth > 0 && newHeight > 0) {
                project1Camera.aspect = newWidth / newHeight;
                project1Camera.updateProjectionMatrix();
                project1Renderer.setSize(newWidth, newHeight);
            }
        }
    });
    
    resizeObserver.observe(container);
}

// Modal functionality with enhanced carousel support
function openModal(modalId) {
    const modal = document.getElementById(modalId + '-modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            modal.classList.add('show');
            initEnhancedCarousel(modalId);
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId + '-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function openProjectModal(projectId) {
    openModal(projectId);
}

function initEnhancedCarousel(projectId) {
    if (!carouselInstances.has(projectId)) {
        const carousel = new EnhancedCarousel(projectId);
        carouselInstances.set(projectId, carousel);
    }
}

// Legacy carousel functions for backward compatibility
function nextEnhancedSlide(projectId) {
    const carousel = carouselInstances.get(projectId);
    if (carousel) carousel.nextSlide();
}

function prevEnhancedSlide(projectId) {
    const carousel = carouselInstances.get(projectId);
    if (carousel) carousel.prevSlide();
}

function goToEnhancedSlide(projectId, index) {
    const carousel = carouselInstances.get(projectId);
    if (carousel) carousel.goToSlide(index);
}

function setupSkillFiltering() {
    const skillFilters = document.querySelectorAll('.skill-filter');
    const skillItems = document.querySelectorAll('.skills-list .skill-item');

    skillFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            const category = filter.getAttribute('data-filter');
            skillFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');

            skillItems.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                const isTarget = category === 'all' || itemCategory === category;
                const isVisible = !item.classList.contains('opacity-0');

                if (isTarget && !isVisible) {
                    item.classList.remove('hidden', 'opacity-0', 'scale-80', 'w-0', 'p-0', '-ml-2');
                    item.classList.add('opacity-100', 'scale-100');
                } else if (!isTarget && isVisible) {
                    item.classList.remove('opacity-100', 'scale-100');
                    item.classList.add('opacity-0', 'scale-80');
                    setTimeout(() => {
                        if (!item.classList.contains('opacity-100')) {
                            item.classList.add('hidden', 'w-0', 'p-0', '-ml-2');
                        }
                    }, 300);
                }
            });
        });
    });
}

function observeSkillsSection() {
    const skillsSection = document.querySelector('#skills');
    const skillItems = document.querySelectorAll('.skills-list .skill-item');
    if (!skillsSection || skillItems.length === 0) return;

    const skillObserver = new IntersectionObserver((entries, observer) => {
        if (entries[0].isIntersecting) {
            skillItems.forEach((item, index) => {
                if(item.classList.contains('opacity-0')) {
                    setTimeout(() => {
                        item.style.transitionDelay = `${index * 50}ms`;
                        item.classList.remove('opacity-0', 'translate-y-5');
                        item.classList.add('opacity-100', 'translate-y-0');
                    }, 50);
                }
            });
            observer.unobserve(skillsSection);
        }
    }, { threshold: 0.3 });
    skillObserver.observe(skillsSection);
}

function showAndHideHints() {
    const hints = document.querySelectorAll('.click-hint');
    if (hints.length > 0) {
        setTimeout(() => {
            hints.forEach(hint => hint.classList.add('opacity-100'));
        }, 1500);
        setTimeout(() => {
            hints.forEach(hint => hint.classList.remove('opacity-100'));
        }, 9000);
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id.replace('-modal', '');
        closeModal(modalId);
    }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="block"]');
        if (openModal) {
            const modalId = openModal.id.replace('-modal', '');
            closeModal(modalId);
        }
    }
});