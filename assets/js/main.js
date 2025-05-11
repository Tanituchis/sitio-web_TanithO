// Script principal para todas las páginas

document.addEventListener('DOMContentLoaded', function() {
    // Marcar elemento activo en el menú lateral
    markActiveMenuItem();
    
    // Inicializar carrito si está en localStorage
    initializeCart();
    
    // Funcionalidad de usuario
    setupUserFunctionality();
    
    // Inicializar formularios con validación si existen
    setupForms();
});

// Función para marcar el elemento activo en el menú lateral
function markActiveMenuItem() {
    const currentLocation = window.location.pathname;
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentLocation.includes(href) && href !== '#' && href !== '') {
            item.classList.add('active');
        }
    });
}

// Funciones para el carrito de compras
let cart = [];

function initializeCart() {
    // Recuperar carrito del localStorage si existe
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCounter();
    }
    
    // Agregar eventListeners para productos si estamos en la página de productos
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const productId = this.getAttribute('data-id');
            addToCart(productId);
        });
    });
    
    // Inicializar funcionalidad de carrito en la página de compra
    if (window.location.pathname.includes('compra.html')) {
        displayCartItems();
        setupCheckoutEvents();
    }
}

function addToCart(productId) {
    fetch('assets/data/products.json')
        .then(response => response.json())
        .then(products => {
            const product = products.find(p => p.id === parseInt(productId));
            if (product) {
                // Verificar si el producto ya está en el carrito
                const existingItem = cart.find(item => item.id === parseInt(productId));
                
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        quantity: 1
                    });
                }
                
                // Guardar en localStorage
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCounter();
                
                // Mostrar mensaje de éxito
                showNotification('Producto agregado al carrito', 'success');
            }
        })
        .catch(error => {
            console.error('Error al cargar productos:', error);
            showNotification('Error al agregar producto', 'error');
        });
}

function updateCartCounter() {
    const cartCounter = document.querySelector('.cart-counter');
    if (cartCounter) {
        const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
        cartCounter.textContent = itemCount;
        
        // Mostrar u ocultar el contador
        if (itemCount > 0) {
            cartCounter.style.display = 'inline-flex';
        } else {
            cartCounter.style.display = 'none';
        }
    }
}

function displayCartItems() {
    const cartItemsContainer = document.querySelector('.cart-items');
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>No hay productos en su carrito.</p>';
        document.querySelector('.order-summary').style.display = 'none';
        document.querySelector('.checkout-form').style.display = 'none';
        return;
    }
    
    let cartHTML = '';
    cart.forEach(item => {
        cartHTML += `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">$${item.price.toLocaleString()}</p>
                    <div class="cart-item-actions">
                        <div class="item-quantity">
                            <button class="quantity-btn decrease-quantity">-</button>
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1" readonly>
                            <button class="quantity-btn increase-quantity">+</button>
                        </div>
                        <button class="remove-item">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
    updateOrderSummary();
}

function updateOrderSummary() {
    const subtotalElement = document.querySelector('.summary-subtotal .value');
    const totalElement = document.querySelector('.summary-total .value');
    
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 0 ? 10 : 0; // Costo de envío fijo
    const total = subtotal + shipping;
    
    document.querySelector('.summary-shipping .value').textContent = `$${shipping.toLocaleString()}`;
    subtotalElement.textContent = `$${subtotal.toLocaleString()}`;
    totalElement.textContent = `$${total.toLocaleString()}`;
}

function setupCheckoutEvents() {
    // Event listeners para botones de cantidad
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const cartItem = this.closest('.cart-item');
            const productId = parseInt(cartItem.getAttribute('data-id'));
            updateCartItemQuantity(productId, 1);
        });
    });
    
    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const cartItem = this.closest('.cart-item');
            const productId = parseInt(cartItem.getAttribute('data-id'));
            updateCartItemQuantity(productId, -1);
        });
    });
    
    // Event listeners para botón eliminar
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const cartItem = this.closest('.cart-item');
            const productId = parseInt(cartItem.getAttribute('data-id'));
            removeCartItem(productId);
        });
    });
    
    // Event listener para el formulario de compra
    const checkoutForm = document.querySelector('.checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (validateCheckoutForm()) {
                processOrder();
            }
        });
    }
}

function updateCartItemQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;
    
    cart[itemIndex].quantity += change;
    
    // Eliminar producto si la cantidad es 0 o menor
    if (cart[itemIndex].quantity <= 0) {
        removeCartItem(productId);
        return;
    }
    
    // Actualizar UI y localStorage
    document.querySelector(`.cart-item[data-id="${productId}"] .quantity-input`).value = cart[itemIndex].quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateOrderSummary();
    updateCartCounter();
}

function removeCartItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Actualizar UI
    const cartItem = document.querySelector(`.cart-item[data-id="${productId}"]`);
    if (cartItem) {
        cartItem.remove();
    }
    
    // Si no hay productos, mostrar mensaje
    if (cart.length === 0) {
        displayCartItems();
    } else {
        updateOrderSummary();
    }
    
    updateCartCounter();
}

function validateCheckoutForm() {
    // Implementar validación del formulario de compra
    const requiredFields = document.querySelectorAll('.checkout-form [required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    // Validación de correo electrónico
    const emailField = document.querySelector('#email');
    if (emailField && emailField.value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailField.value)) {
            emailField.classList.add('error');
            isValid = false;
        }
    }
    
    if (!isValid) {
        showNotification('Por favor, complete todos los campos requeridos correctamente', 'error');
    }
    
    return isValid;
}

function processOrder() {
    // Simular procesamiento de orden
    showNotification('Procesando su orden...', 'info');
    
    setTimeout(() => {
        // Limpiar carrito
        cart = [];
        localStorage.removeItem('cart');
        
        // Mostrar mensaje de éxito
        document.querySelector('.checkout-container').innerHTML = `
            <div class="section">
                <h2 class="section-title">¡Orden Completada!</h2>
                <p>Su orden ha sido procesada exitosamente. Hemos enviado un correo de confirmación con los detalles de su compra.</p>
                <p>Número de orden: ORD-${Math.floor(Math.random() * 1000000)}</p>
                <div style="margin-top: 30px;">
                    <a href="index.html" class="btn">Volver al inicio</a>
                </div>
            </div>
        `;
        
        updateCartCounter();
    }, 2000);
}

// Funciones para usuario
function setupUserFunctionality() {
    // Comprobar si el usuario está logueado
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userSection = document.querySelector('.user-actions');
    
    if (userSection) {
        if (isLoggedIn) {
            const username = localStorage.getItem('username') || 'Usuario';
            userSection.innerHTML = `
                <span>Hola, ${username}</span>
                <a href="usuario.html"><i class="fas fa-user-circle"></i> Mi cuenta</a>
                <a href="#" id="logout"><i class="fas fa-sign-out-alt"></i> Cerrar sesión</a>
                <a href="compra.html"><i class="fas fa-shopping-cart"></i> Carrito <span class="cart-counter">0</span></a>
            `;
            
            // Evento para cerrar sesión
            document.getElementById('logout').addEventListener('click', function(event) {
                event.preventDefault();
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            });
        } else {
            userSection.innerHTML = `
                <a href="usuario.html"><i class="fas fa-sign-in-alt"></i> Iniciar sesión</a>
                <a href="compra.html"><i class="fas fa-shopping-cart"></i> Carrito <span class="cart-counter">0</span></a>
            `;
        }
    }
    
    // Inicializar formulario de login si estamos en la página de usuario
    if (window.location.pathname.includes('usuario.html')) {
        const loginForm = document.querySelector('#login-form');
        const registerForm = document.querySelector('#register-form');
        
        if (isLoggedIn) {
            // Mostrar panel de usuario
            displayUserDashboard();
        } else if (loginForm) {
            // Setup formulario de login
            loginForm.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const username = document.querySelector('#login-username').value;
                const password = document.querySelector('#login-password').value;
                
                // Simulación de login (en un caso real, esto sería una API)
                if (username && password) {
                    // Guardar estado de login en localStorage
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    
                    showNotification('¡Bienvenido de nuevo!', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showNotification('Por favor, ingrese usuario y contraseña', 'error');
                }
            });
        }
        
        if (registerForm) {
            // Setup formulario de registro
            registerForm.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const username = document.querySelector('#register-username').value;
                const email = document.querySelector('#register-email').value;
                const password = document.querySelector('#register-password').value;
                const confirmPassword = document.querySelector('#confirm-password').value;
                
                // Validación simple
                if (!username || !email || !password || !confirmPassword) {
                    showNotification('Por favor, complete todos los campos', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showNotification('Las contraseñas no coinciden', 'error');
                    return;
                }
                
                // Simulación de registro exitoso
                showNotification('¡Registro exitoso!', 'success');
                
                // Guardar estado de login en localStorage
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }
    }
}

function displayUserDashboard() {
    const username = localStorage.getItem('username') || 'Usuario';
    const mainContent = document.querySelector('.main-content');
    
    if (mainContent) {
        mainContent.innerHTML = `
            <header>
                <h1 class="page-title">Mi cuenta</h1>
                <div class="user-actions">
                    <span>Hola, ${username}</span>
                    <a href="#" id="logout"><i class="fas fa-sign-out-alt"></i> Cerrar sesión</a>
                    <a href="compra.html"><i class="fas fa-shopping-cart"></i> Carrito <span class="cart-counter">0</span></a>
                </div>
            </header>
            
            <div class="section">
                <h2 class="section-title">Panel de Usuario</h2>
                <div class="user-dashboard">
                    <div class="dashboard-menu">
                        <ul>
                            <li><a href="#" class="active" data-tab="profile">Mi perfil</a></li>
                            <li><a href="#" data-tab="orders">Mis pedidos</a></li>
                            <li><a href="#" data-tab="addresses">Direcciones</a></li>
                            <li><a href="#" data-tab="settings">Configuración</a></li>
                        </ul>
                    </div>
                    <div class="dashboard-content">
                        <div id="profile" class="dashboard-tab active">
                            <h3>Información personal</h3>
                            <form id="profile-form">
                                <div class="form-group">
                                    <label for="profile-name">Nombre completo</label>
                                    <input type="text" id="profile-name" value="${username}">
                                </div>
                                <div class="form-group">
                                    <label for="profile-email">Correo electrónico</label>
                                    <input type="email" id="profile-email" value="usuario@example.com">
                                </div>
                                <div class="form-group">
                                    <label for="profile-phone">Teléfono</label>
                                    <input type="tel" id="profile-phone" value="">
                                </div>
                                <div class="form-group">
                                    <label for="profile-company">Empresa</label>
                                    <input type="text" id="profile-company" value="">
                                </div>
                                <button type="submit" class="btn">Guardar cambios</button>
                            </form>
                        </div>
                        <div id="orders" class="dashboard-tab">
                            <h3>Historial de pedidos</h3>
                            <p>No hay pedidos recientes.</p>
                        </div>
                        <div id="addresses" class="dashboard-tab">
                            <h3>Mis direcciones</h3>
                            <p>No hay direcciones guardadas.</p>
                            <button class="btn">Agregar nueva dirección</button>
                        </div>
                        <div id="settings" class="dashboard-tab">
                            <h3>Configuración de la cuenta</h3>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" checked> Recibir notificaciones por email
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox"> Boletín de noticias
                                </label>
                            </div>
                            <div class="form-group">
                                <button class="btn btn-secondary">Cambiar contraseña</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eventos para las pestañas del dashboard
        const tabLinks = document.querySelectorAll('.dashboard-menu a');
        const tabContents = document.querySelectorAll('.dashboard-tab');
        
        tabLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                
                // Eliminar active de todos los enlaces y tabs
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(t => t.classList.remove('active'));
                
                // Agregar active al enlace clicado
                this.classList.add('active');
                
                // Mostrar el tab correspondiente
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Evento para cerrar sesión
        document.getElementById('logout').addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
        
        // Evento para el formulario de perfil
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', function(event) {
                event.preventDefault();
                showNotification('Perfil actualizado correctamente', 'success');
            });
        }
    }
}

// Configuración de formularios
function setupForms() {
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Validación simple del formulario
            const name = document.querySelector('#contact-name').value;
            const email = document.querySelector('#contact-email').value;
            const message = document.querySelector('#contact-message').value;
            
            if (!name || !email || !message) {
                showNotification('Por favor, complete todos los campos', 'error');
                return;
            }
            
            // Simular envío de formulario
            showNotification('Mensaje enviado correctamente', 'success');
            contactForm.reset();
        });
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
