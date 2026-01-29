// LyricFlow Authentication System
const Auth = {
    // Default credentials
    users: [
        {
            username: 'user',
            password: 'user123',
            role: 'user',
            secretKey: null
        },
        {
            username: 'dev',
            password: 'dev123',
            role: 'developer',
            secretKey: 'LYRICFLOW_DEV_2024_SECRET'
        }
    ],
    
    init() {
        this.setupLoginForm();
        this.setupDevLoginForm();
    },
    
    setupLoginForm() {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    },
    
    setupDevLoginForm() {
        const form = document.getElementById('devLoginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDevLogin();
        });
    },
    
    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const user = this.users.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            this.loginSuccess(user);
        } else {
            document.getElementById('loginError').textContent = 'Username atau password salah!';
        }
    },
    
    handleDevLogin() {
        const username = document.getElementById('devUsername').value;
        const password = document.getElementById('devPassword').value;
        const secretKey = document.getElementById('devSecretKey').value;
        
        const user = this.users.find(u => 
            u.username === username && 
            u.password === password && 
            u.role === 'developer' &&
            u.secretKey === secretKey
        );
        
        if (user) {
            this.loginSuccess(user);
            closeDevLogin();
        } else {
            document.getElementById('devLoginError').textContent = 'Akses ditolak! Data developer tidak valid.';
        }
    },
    
    loginSuccess(user) {
        const userData = {
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('lyricflow_user', JSON.stringify(userData));
        App.currentUser = userData;
        
        if (user.role === 'developer') {
            App.isDev = true;
        }
        
        App.updateUIForUser();
        closeLogin();
        
        // Show app
        document.getElementById('app').classList.remove('hidden');
        
        console.log(`✅ Logged in as ${user.role}: ${user.username}`);
    }
};

// Initialize auth
document.addEventListener('DOMContentLoaded', () => Auth.init());
