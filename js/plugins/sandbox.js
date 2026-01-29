/**
 * LYRICFLOW v1.3 - SANDBOX
 * Secure plugin execution environment
 */

const LFSandbox = {
    // Allowed globals
    whitelist: [
        'console', 'Math', 'Date', 'JSON',
        'Array', 'Object', 'String', 'Number', 'Boolean',
        'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap',
        'Error', 'TypeError', 'ReferenceError', 'SyntaxError',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite',
        'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'requestAnimationFrame', 'cancelAnimationFrame'
    ],
    
    // Dangerous patterns to check
    blacklist: [
        'eval\\s*\\(',
        'new\\s+Function',
        'document\\.write',
        'innerHTML\\s*=',
        'outerHTML\\s*=',
        'insertAdjacentHTML',
        'document\\.location',
        'window\\.location',
        'top\\.location',
        'parent\\.location',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'open\\s*\\(',
        'WebSocket',
        'Worker',
        'SharedArrayBuffer',
        'importScripts'
    ],
    
    create(code, context = {}) {
        // Security check
        if (!this.securityCheck(code)) {
            throw new Error('Plugin failed security check');
        }
        
        // Create sandbox environment
        const sandbox = {};
        
        // Add whitelisted globals
        this.whitelist.forEach(name => {
            if (window[name] !== undefined) {
                sandbox[name] = window[name];
            }
        });
        
        // Add context
        Object.assign(sandbox, context);
        
        // Create safe console
        sandbox.console = this.createSafeConsole();
        
        // Execute in sandbox
        const wrappedCode = `
            (function() {
                "use strict";
                ${code}
                return typeof exports !== 'undefined' ? exports : this;
            }).call(sandbox)
        `;
        
        try {
            const fn = new Function('sandbox', wrappedCode);
            return fn(sandbox);
        } catch (e) {
            console.error('Sandbox execution error:', e);
            throw e;
        }
    },
    
    securityCheck(code) {
        // Check for blacklisted patterns
        for (const pattern of this.blacklist) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(code)) {
                console.warn('Security violation detected:', pattern);
                return false;
            }
        }
        
        // Check for excessive length
        if (code.length > 100000) {
            console.warn('Plugin code too large');
            return false;
        }
        
        return true;
    },
    
    createSafeConsole() {
        return {
            log: (...args) => console.log('[Plugin]', ...args),
            warn: (...args) => console.warn('[Plugin]', ...args),
            error: (...args) => console.error('[Plugin]', ...args),
            info: (...args) => console.info('[Plugin]', ...args)
        };
    },
    
    // CSP-compatible script loading
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            
            document.head.appendChild(script);
        });
    }
};
