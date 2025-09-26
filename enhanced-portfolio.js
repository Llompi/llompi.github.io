// Enhanced Portfolio JavaScript with Professional Robotic Arm Implementation

// Global Variables
let scene, camera, renderer, controls;
let backgroundModels = [];
let reflectorObjects = [];

// Professional robotic arm variables
let roboticArmGroup;
let armJoints = [];
let armAnimationId = null;
let isAnimating = false;
let targetAngles = [];
let currentAngles = [];
let animationPhase = 0;

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
    initProfessionalRoboticArm();
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

// Professional 6-DOF Robotic Arm Implementation
function initProfessionalRoboticArm() {
    const container = document.getElementById('project-model-1');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) {
        setTimeout(() => initProfessionalRoboticArm(), 100);
        return;
    }

    // Create dedicated scene for robotic arm
    const armScene = new THREE.Scene();
    armScene.background = new THREE.Color(0x1a1a1a);
    
    const armCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    armCamera.position.set(20, 15, 20);
    
    const armRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    armRenderer.setSize(width, height);
    armRenderer.shadowMap.enabled = true;
    armRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    armRenderer.setClearColor(0x000000, 0);
    container.appendChild(armRenderer.domElement);

    // Professional lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    armScene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(15, 20, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    armScene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xFF9A00, 0.4);
    fillLight.position.set(-10, 10, 5);
    armScene.add(fillLight);
    
    const rimLight = new THREE.PointLight(0xFFB347, 0.6, 50);
    rimLight.position.set(0, 15, -10);
    armScene.add(rimLight);

    // Create professional materials
    const materials = {
        base: new THREE.MeshStandardMaterial({
            color: 0x2c2c2c,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1.0
        }),
        joint: new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.2
        }),
        link: new THREE.MeshStandardMaterial({
            color: 0xFF6B35,
            metalness: 0.3,
            roughness: 0.4,
            envMapIntensity: 0.8
        }),
        endEffector: new THREE.MeshStandardMaterial({
            color: 0xFF3030,
            metalness: 0.7,
            roughness: 0.3,
            envMapIntensity: 1.0
        })
    };

    // Initialize arm structure
    roboticArmGroup = new THREE.Group();
    armJoints = [];
    currentAngles = [0, 0, 0, 0, 0, 0];
    targetAngles = [0, 0, 0, 0, 0, 0];

    // Build robotic arm with proper hierarchy
    buildRoboticArmStructure(materials);
    
    armScene.add(roboticArmGroup);

    // Create work environment
    createWorkEnvironment(armScene, materials);

    // Setup controls
    const armControls = new THREE.OrbitControls(armCamera, armRenderer.domElement);
    armControls.target.set(0, 8, 0);
    armControls.enableDamping = true;
    armControls.dampingFactor = 0.05;
    armControls.minDistance = 10;
    armControls.maxDistance = 50;
    armControls.maxPolarAngle = Math.PI * 0.8;
    armControls.update();

    // Animation loop
    function animateArm() {
        requestAnimationFrame(animateArm);
        
        if (isAnimating) {
            updateRobotAnimation();
        }
        
        armControls.update();
        armRenderer.render(armScene, armCamera);
    }
    
    animateArm();

    // Setup control buttons
    setupArmControls();

    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width: newWidth, height: newHeight } = entry.contentRect;
            if (newWidth > 0 && newHeight > 0) {
                armCamera.aspect = newWidth / newHeight;
                armCamera.updateProjectionMatrix();
                armRenderer.setSize(newWidth, newHeight);
            }
        }
    });
    
    resizeObserver.observe(container);
}

function buildRoboticArmStructure(materials) {
    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(3, 4, 1.5, 16);
    const baseMesh = new THREE.Mesh(baseGeometry, materials.base);
    baseMesh.position.y = 0.75;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    roboticArmGroup.add(baseMesh);

    // Joint 1 (Base rotation) - Waist
    const joint1Group = new THREE.Group();
    joint1Group.position.set(0, 1.5, 0);
    
    const joint1Geometry = new THREE.CylinderGeometry(1.2, 1.2, 2, 12);
    const joint1Mesh = new THREE.Mesh(joint1Geometry, materials.joint);
    joint1Mesh.castShadow = true;
    joint1Group.add(joint1Mesh);
    
    roboticArmGroup.add(joint1Group);
    armJoints.push({ group: joint1Group, axis: 'y', limits: [-Math.PI, Math.PI] });

    // Link 1 (Shoulder to elbow)
    const link1Group = new THREE.Group();
    link1Group.position.set(0, 2, 0);
    
    const link1Geometry = new THREE.BoxGeometry(1.5, 6, 1.5);
    const link1Mesh = new THREE.Mesh(link1Geometry, materials.link);
    link1Mesh.position.y = 3;
    link1Mesh.castShadow = true;
    link1Group.add(link1Mesh);
    
    joint1Group.add(link1Group);
    armJoints.push({ group: link1Group, axis: 'z', limits: [-Math.PI/2, Math.PI/2] });

    // Joint 2 (Elbow)
    const joint2Group = new THREE.Group();
    joint2Group.position.set(0, 6, 0);
    
    const joint2Geometry = new THREE.SphereGeometry(1, 12, 8);
    const joint2Mesh = new THREE.Mesh(joint2Geometry, materials.joint);
    joint2Mesh.castShadow = true;
    joint2Group.add(joint2Mesh);
    
    link1Group.add(joint2Group);

    // Link 2 (Elbow to wrist)
    const link2Group = new THREE.Group();
    link2Group.position.set(0, 1, 0);
    
    const link2Geometry = new THREE.BoxGeometry(1.2, 5, 1.2);
    const link2Mesh = new THREE.Mesh(link2Geometry, materials.link);
    link2Mesh.position.y = 2.5;
    link2Mesh.castShadow = true;
    link2Group.add(link2Mesh);
    
    joint2Group.add(link2Group);
    armJoints.push({ group: link2Group, axis: 'z', limits: [-Math.PI/3, Math.PI/3] });

    // Joint 3 (Wrist roll)
    const joint3Group = new THREE.Group();
    joint3Group.position.set(0, 5, 0);
    
    const joint3Geometry = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 10);
    const joint3Mesh = new THREE.Mesh(joint3Geometry, materials.joint);
    joint3Mesh.castShadow = true;
    joint3Group.add(joint3Mesh);
    
    link2Group.add(joint3Group);
    armJoints.push({ group: joint3Group, axis: 'y', limits: [-Math.PI, Math.PI] });

    // Joint 4 (Wrist pitch)
    const joint4Group = new THREE.Group();
    joint4Group.position.set(0, 1, 0);
    
    const joint4Geometry = new THREE.BoxGeometry(1.5, 0.8, 1.5);
    const joint4Mesh = new THREE.Mesh(joint4Geometry, materials.joint);
    joint4Mesh.castShadow = true;
    joint4Group.add(joint4Mesh);
    
    joint3Group.add(joint4Group);
    armJoints.push({ group: joint4Group, axis: 'x', limits: [-Math.PI/2, Math.PI/2] });

    // Joint 5 (Wrist yaw)
    const joint5Group = new THREE.Group();
    joint5Group.position.set(0, 0.5, 0);
    
    const joint5Geometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 8);
    const joint5Mesh = new THREE.Mesh(joint5Geometry, materials.joint);
    joint5Mesh.castShadow = true;
    joint5Group.add(joint5Mesh);
    
    joint4Group.add(joint5Group);
    armJoints.push({ group: joint5Group, axis: 'z', limits: [-Math.PI/2, Math.PI/2] });

    // End effector (Gripper)
    const endEffectorGroup = new THREE.Group();
    endEffectorGroup.position.set(0, 1, 0);
    
    // Gripper base
    const gripperBaseGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.8);
    const gripperBaseMesh = new THREE.Mesh(gripperBaseGeometry, materials.endEffector);
    gripperBaseMesh.castShadow = true;
    endEffectorGroup.add(gripperBaseMesh);
    
    // Gripper fingers
    const fingerGeometry = new THREE.BoxGeometry(0.2, 1, 0.6);
    const finger1 = new THREE.Mesh(fingerGeometry, materials.endEffector);
    finger1.position.set(0.4, 0, 0);
    finger1.castShadow = true;
    endEffectorGroup.add(finger1);
    
    const finger2 = new THREE.Mesh(fingerGeometry, materials.endEffector);
    finger2.position.set(-0.4, 0, 0);
    finger2.castShadow = true;
    endEffectorGroup.add(finger2);
    
    joint5Group.add(endEffectorGroup);

    // Add visual enhancements
    addVisualEnhancements(roboticArmGroup, materials);
}

function addVisualEnhancements(armGroup, materials) {
    // Add hydraulic cylinders
    for (let i = 0; i < 3; i++) {
        const cylinderGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
        const cylinder = new THREE.Mesh(cylinderGeometry, materials.joint);
        cylinder.position.set(
            Math.cos(i * 2.09) * 1.5,
            3 + i * 2,
            Math.sin(i * 2.09) * 1.5
        );
        cylinder.castShadow = true;
        armGroup.add(cylinder);
    }

    // Add cable conduits
    for (let i = 0; i < 4; i++) {
        const conduitGeometry = new THREE.CylinderGeometry(0.08, 0.08, 8, 6);
        const conduit = new THREE.Mesh(conduitGeometry, new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.2,
            roughness: 0.8
        }));
        conduit.position.set(
            0.8 * Math.cos(i * Math.PI / 2),
            6,
            0.8 * Math.sin(i * Math.PI / 2)
        );
        conduit.castShadow = true;
        armGroup.add(conduit);
    }
}

function createWorkEnvironment(scene, materials) {
    // Work surface
    const surfaceGeometry = new THREE.BoxGeometry(20, 0.5, 20);
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.1,
        roughness: 0.9
    });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.position.y = -0.5;
    surface.receiveShadow = true;
    scene.add(surface);

    // Work pieces
    const workPieceGeometry = new THREE.BoxGeometry(1, 1, 1);
    const workPieceMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const workPiece1 = new THREE.Mesh(workPieceGeometry, workPieceMaterial);
    workPiece1.position.set(5, 0.5, 3);
    workPiece1.castShadow = true;
    workPiece1.receiveShadow = true;
    scene.add(workPiece1);
    
    const workPiece2 = new THREE.Mesh(workPieceGeometry, workPieceMaterial.clone());
    workPiece2.material.color.setHex(0x2196F3);
    workPiece2.position.set(-4, 0.5, -2);
    workPiece2.castShadow = true;
    workPiece2.receiveShadow = true;
    scene.add(workPiece2);

    // Safety barriers
    const barrierGeometry = new THREE.BoxGeometry(0.2, 3, 8);
    const barrierMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFEB3B,
        metalness: 0.1,
        roughness: 0.9
    });
    
    const barrier1 = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier1.position.set(8, 1.5, 0);
    barrier1.castShadow = true;
    scene.add(barrier1);
    
    const barrier2 = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier2.position.set(-8, 1.5, 0);
    barrier2.castShadow = true;
    scene.add(barrier2);
}

function updateRobotAnimation() {
    const time = Date.now() * 0.001;
    animationPhase += 0.02;

    // Define different animation sequences
    const sequences = [
        // Pick and place sequence
        {
            duration: 8,
            keyframes: [
                { time: 0, angles: [0, 0, 0, 0, 0, 0] },
                { time: 2, angles: [Math.PI/4, -Math.PI/6, Math.PI/8, Math.PI/4, -Math.PI/6, 0] },
                { time: 4, angles: [Math.PI/2, -Math.PI/4, Math.PI/4, Math.PI/2, -Math.PI/3, 0] },
                { time: 6, angles: [-Math.PI/4, Math.PI/6, -Math.PI/8, -Math.PI/4, Math.PI/6, 0] },
                { time: 8, angles: [0, 0, 0, 0, 0, 0] }
            ]
        },
        // Welding sequence
        {
            duration: 6,
            keyframes: [
                { time: 0, angles: [0, 0, 0, 0, 0, 0] },
                { time: 1.5, angles: [Math.PI/6, -Math.PI/3, Math.PI/6, Math.PI/3, 0, Math.PI/8] },
                { time: 3, angles: [Math.PI/3, -Math.PI/2, Math.PI/3, Math.PI/6, Math.PI/4, -Math.PI/8] },
                { time: 4.5, angles: [-Math.PI/6, Math.PI/3, -Math.PI/6, -Math.PI/3, 0, Math.PI/8] },
                { time: 6, angles: [0, 0, 0, 0, 0, 0] }
            ]
        }
    ];

    const currentSequence = sequences[Math.floor(animationPhase / 10) % sequences.length];
    const sequenceTime = (animationPhase % 10) * (currentSequence.duration / 10);

    // Interpolate between keyframes
    for (let i = 0; i < currentSequence.keyframes.length - 1; i++) {
        const keyframe1 = currentSequence.keyframes[i];
        const keyframe2 = currentSequence.keyframes[i + 1];
        
        if (sequenceTime >= keyframe1.time && sequenceTime <= keyframe2.time) {
            const t = (sequenceTime - keyframe1.time) / (keyframe2.time - keyframe1.time);
            const smoothT = t * t * (3 - 2 * t); // Smooth step interpolation
            
            for (let j = 0; j < 6; j++) {
                targetAngles[j] = keyframe1.angles[j] + (keyframe2.angles[j] - keyframe1.angles[j]) * smoothT;
            }
            break;
        }
    }

    // Smooth movement towards target angles
    for (let i = 0; i < armJoints.length; i++) {
        const joint = armJoints[i];
        const targetAngle = Math.max(joint.limits[0], Math.min(joint.limits[1], targetAngles[i]));
        
        // Smooth interpolation
        currentAngles[i] += (targetAngle - currentAngles[i]) * 0.05;
        
        // Apply rotation
        if (joint.axis === 'x') {
            joint.group.rotation.x = currentAngles[i];
        } else if (joint.axis === 'y') {
            joint.group.rotation.y = currentAngles[i];
        } else if (joint.axis === 'z') {
            joint.group.rotation.z = currentAngles[i];
        }
    }
}

function setupArmControls() {
    const animateBtn = document.getElementById('arm-animate');
    const resetBtn = document.getElementById('arm-reset');
    
    if (animateBtn) {
        animateBtn.addEventListener('click', () => {
            isAnimating = !isAnimating;
            animateBtn.textContent = isAnimating ? 'Stop Animation' : 'Start Animation';
            animateBtn.classList.toggle('active', isAnimating);
            
            if (isAnimating) {
                animationPhase = 0;
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            isAnimating = false;
            if (animateBtn) {
                animateBtn.textContent = 'Start Animation';
                animateBtn.classList.remove('active');
            }
            
            // Reset all joints to home position
            targetAngles.fill(0);
            animationPhase = 0;
            
            // Smooth reset animation
            const resetDuration = 2000;
            const startTime = Date.now();
            const startAngles = [...currentAngles];
            
            function performReset() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / resetDuration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                for (let i = 0; i < armJoints.length; i++) {
                    currentAngles[i] = startAngles[i] * (1 - easeProgress);
                    
                    const joint = armJoints[i];
                    if (joint.axis === 'x') {
                        joint.group.rotation.x = currentAngles[i];
                    } else if (joint.axis === 'y') {
                        joint.group.rotation.y = currentAngles[i];
                    } else if (joint.axis === 'z') {
                        joint.group.rotation.z = currentAngles[i];
                    }
                }
                
                if (progress < 1) {
                    requestAnimationFrame(performReset);
                }
            }
            
            performReset();
        });
    }
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