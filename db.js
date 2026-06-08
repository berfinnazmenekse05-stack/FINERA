const DB_PREFIX = "smartfinance_";

class Database {
    constructor() {
        this.memoryStore = {};
        this.useMemory = false;
        
        // Test if localStorage is available and writable
        try {
            const testKey = '__test_local_storage__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
        } catch (e) {
            console.warn("LocalStorage is disabled or blocked. Falling back to in-memory database.");
            this.useMemory = true;
        }

        this.init();
    }

    init() {
        try {
            let users = this.get('users');
            
            // Increment sentinel to v4 to trigger fresh seed with currency fields
            const initKey = `${DB_PREFIX}initialized_v4`;
            let isInitialized = false;
            
            if (this.useMemory) {
                isInitialized = this.memoryStore[initKey] === "true";
            } else {
                isInitialized = localStorage.getItem(initKey) === "true";
            }

            if (!isInitialized || !users || users.length === 0) {
                this.seedData();
                if (this.useMemory) {
                    this.memoryStore[initKey] = "true";
                } else {
                    localStorage.setItem(initKey, "true");
                }
            }
        } catch (e) {
            console.error("Database initialization failed, falling back to memory:", e);
            this.useMemory = true;
            this.seedData();
            this.setSession("1");
        }
    }

    seedData() {
        const today = new Date();
        const yest = (d) => { const n = new Date(today); n.setDate(n.getDate() - d); return n.toISOString().split('T')[0]; };

        // PERSONA 1: Retail (Stable)
        const user1 = { id: 1, name: 'Bireysel - Demo', email: 'bireysel@sri.com', password: '123' };
        // PERSONA 2: SME (Critical Risk - Tech Solutions)
        const user2 = { id: 2, name: 'KOBİ - Tech Solutions', email: 'kobi@sri.com', password: '123' };
        // PERSONA 3: Institutional (Low Risk - Global Logistics)
        const user3 = { id: 3, name: 'Kurumsal - Global Logistics', email: 'kurumsal@sri.com', password: '123' };

        const transactions = [
            // User 1 - Stable
            { id: 1, user_id: 1, type: 'income', amount: 5000, category: 'Salary', date: yest(14), currency: 'USD' },
            { id: 2, user_id: 1, type: 'expense', amount: 1200, category: 'Rent', date: yest(7), currency: 'USD' },
            { id: 3, user_id: 1, type: 'expense', amount: 300, category: 'Groceries', date: yest(1), currency: 'USD' },
            
            // User 2 - CRITICAL (Spending > Income)
            { id: 4, user_id: 2, type: 'income', amount: 10000, category: 'Invoice Received', date: yest(20), currency: 'USD' },
            { id: 5, user_id: 2, type: 'expense', amount: 8000, category: 'Supplier Payment', date: yest(15), currency: 'USD' },
            { id: 6, user_id: 2, type: 'expense', amount: 6000, category: 'Operational Cost', date: yest(5), currency: 'USD' }, // Negative Velocity
            { id: 7, user_id: 2, type: 'expense', amount: 2000, category: 'Server Costs', date: yest(1), currency: 'USD' },
            
            // User 3 - STABLE CORPORATE
            { id: 8, user_id: 3, type: 'income', amount: 50000, category: 'Subsidy', date: yest(30), currency: 'USD' },
            { id: 9, user_id: 3, type: 'income', amount: 30000, category: 'Service Revenue', date: yest(10), currency: 'USD' },
            { id: 10, user_id: 3, type: 'expense', amount: 20000, category: 'Logistics Cost', date: yest(5), currency: 'USD' }
        ];

        const debts = [
            { id: 1, user_id: 1, total_debt: 8000, monthly_payment: 200, due_date: yest(0) },
            { id: 2, user_id: 2, total_debt: 45000, monthly_payment: 1200, due_date: yest(0) }, // SME High Debt
            { id: 3, user_id: 3, total_debt: 100000, monthly_payment: 2500, due_date: yest(0) }
        ];

        const subs = [
            { id: 1, user_id: 1, name: 'Spotify', monthly_cost: 9.99, next_payment_date: yest(0), currency: 'USD' },
            { id: 2, user_id: 2, name: 'AWS Enterprise', monthly_cost: 450, next_payment_date: yest(0), currency: 'USD' },
            { id: 3, user_id: 3, name: 'SaaS Platform', monthly_cost: 1500, next_payment_date: yest(0), currency: 'USD' }
        ];

        this.set('users', [user1, user2, user3]);
        this.set('transactions', transactions);
        this.set('debts', debts);
        this.set('subscriptions', subs);
        this.set('interventions', []);
        this.set('gps_goals', []);
        this.set('ai_decisions', []);
    }

    // --- Core CRUD ---
    get(table) {
        if (this.useMemory) {
            return this.memoryStore[table] || [];
        }
        try {
            const data = localStorage.getItem(`${DB_PREFIX}${table}`);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error(`Error reading table ${table} from localStorage:`, e);
            return [];
        }
    }

    set(table, data) {
        if (this.useMemory) {
            this.memoryStore[table] = data;
            return;
        }
        try {
            localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));
        } catch (e) {
            console.error(`Error writing table ${table} to localStorage, falling back to memory:`, e);
            this.useMemory = true;
            this.memoryStore[table] = data;
        }
    }

    insert(table, record) {
        const data = this.get(table);
        record.id = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
        data.push(record);
        this.set(table, data);
        return record;
    }

    delete(table, id) {
        const data = this.get(table);
        const filtered = data.filter(d => d.id !== id);
        this.set(table, filtered);
    }

    // --- Session helpers ---
    getSession() {
        if (this.useMemory) {
            return this.memoryStore['session'] || null;
        }
        try {
            return localStorage.getItem(`${DB_PREFIX}session`);
        } catch (e) {
            return this.memoryStore['session'] || null;
        }
    }

    setSession(value) {
        if (this.useMemory) {
            this.memoryStore['session'] = value;
            return;
        }
        try {
            localStorage.setItem(`${DB_PREFIX}session`, value);
        } catch (e) {
            this.memoryStore['session'] = value;
        }
    }

    removeSession() {
        if (this.useMemory) {
            delete this.memoryStore['session'];
            return;
        }
        try {
            localStorage.removeItem(`${DB_PREFIX}session`);
        } catch (e) {
            delete this.memoryStore['session'];
        }
    }

    // --- Authentication ---
    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        const users = this.get('users');
        const userId = parseInt(session, 10);
        return users.find(u => u.id === userId) || null;
    }

    login(email, password) {
        const users = this.get('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            this.setSession(user.id.toString());
            return true;
        }
        return false;
    }

    register(name, email, password) {
        const users = this.get('users');
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already exists' };
        }
        
        const newUser = this.insert('users', { name, email, password });
        this.setSession(newUser.id.toString());
        return { success: true };
    }


    getGPSGoals(userId) {
        let goals = this.get('gps_goals');
        let updated = false;
        const userGoals = goals.filter(g => g.user_id === userId);
        userGoals.forEach(g => {
            if (!g.id) {
                g.id = 'gps_legacy_' + userId + '_' + Math.random().toString(36).substr(2, 9);
                updated = true;
            }
        });
        if (updated) {
            this.set('gps_goals', goals);
        }
        return userGoals;
    }

    getGPSGoal(goalId) {
        const goals = this.get('gps_goals');
        return goals.find(g => g.id === goalId) || null;
    }

    addGPSGoal(userId, goalData) {
        let goals = this.get('gps_goals');
        const record = {
            id: 'gps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            ...goalData
        };
        goals.push(record);
        this.set('gps_goals', goals);
        return record;
    }

    updateGPSGoal(goalId, goalData) {
        let goals = this.get('gps_goals');
        const index = goals.findIndex(g => g.id === goalId);
        if (index !== -1) {
            goals[index] = { ...goals[index], ...goalData };
            this.set('gps_goals', goals);
            return goals[index];
        }
        return null;
    }

    deleteGPSGoal(goalId) {
        let goals = this.get('gps_goals');
        const filtered = goals.filter(g => g.id !== goalId);
        this.set('gps_goals', filtered);
    }

    getAIDecisions(userId) {
        const decisions = this.get('ai_decisions');
        return decisions.filter(d => d.user_id === userId);
    }

    addAIDecision(userId, decisionData) {
        let decisions = this.get('ai_decisions');
        const record = {
            id: 'dec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            timestamp: new Date().toISOString(),
            ...decisionData
        };
        decisions.push(record);
        this.set('ai_decisions', decisions);
        return record;
    }

    deleteAIDecision(decisionId) {
        let decisions = this.get('ai_decisions');
        const filtered = decisions.filter(d => d.id !== decisionId);
        this.set('ai_decisions', filtered);
    }

    logout() {
        this.removeSession();
    }
}

window.db = new Database();
