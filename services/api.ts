const API_URL = 'http://localhost:8000';

export interface BidPackage {
    id: number;
    name: string;
    description?: string;
    created_at: string;
}

export interface Contractor {
    id: number;
    name: string;
    bid_package_id: number;
    gemini_store_name?: string;
}

export interface EvaluationResult {
    id: number;
    contractor_id: number;
    criteria_prompt: string;
    score: number;
    comment: string;
    evidence: string;
}

export interface ContractorFile {
    id: number;
    contractor_id: number;
    filename: string;
    file_path: string;
    gemini_file_name?: string;
    gemini_file_uri?: string;
    is_stored_in_gemini: boolean;
    created_at: string;
}

export interface User {
    id: number;
    username: string;
    full_name?: string;
    is_active: boolean;
    role: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    async getBidPackages(): Promise<BidPackage[]> {
        const res = await fetch(`${API_URL}/bid_packages/`, {
            headers: { ...getAuthHeaders() }
        });
        return res.json();
    },

    async updateBidPackage(id: number, name: string, description?: string): Promise<BidPackage> {
        const res = await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, description })
        });
        return res.json();
    },

    async deleteBidPackage(id: number): Promise<void> {
        await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() }
        });
    },

    async createBidPackage(name: string, description?: string): Promise<BidPackage> {
        const res = await fetch(`${API_URL}/bid_packages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, description })
        });
        return res.json();
    },

    async getContractors(bidPackageId: number): Promise<Contractor[]> {
        const res = await fetch(`${API_URL}/bid_packages/${bidPackageId}/contractors`, {
            headers: { ...getAuthHeaders() }
        });
        return res.json();
    },

    async createContractor(name: string, bidPackageId: number): Promise<Contractor> {
        const res = await fetch(`${API_URL}/contractors/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, bid_package_id: bidPackageId })
        });
        return res.json();
    },

    async updateContractor(id: number, name: string): Promise<Contractor> {
        const res = await fetch(`${API_URL}/contractors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, bid_package_id: 0 }) 
        });
        return res.json();
    },

    async deleteContractor(id: number): Promise<void> {
        await fetch(`${API_URL}/contractors/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() }
        });
    },

    async processContractorFiles(contractorId: number, files: File[]): Promise<{ status: string, message: string }> {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        const res = await fetch(`${API_URL}/contractors/${contractorId}/process-files`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }, // Note: Content-Type is auto-set for FormData
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Xử lý tệp thất bại');
        }
        return res.json();
    },

    async evaluateContractor(contractorId: number, prompts: string[]): Promise<{ status: string, results: any[] }> {
        const formData = new FormData();
        formData.append('contractor_id', contractorId.toString());
        formData.append('prompts', JSON.stringify(prompts));

        const res = await fetch(`${API_URL}/evaluate/`, {
            method: 'POST',
            headers: { ...getAuthHeaders() },
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Đánh giá thất bại');
        }
        return res.json();
    },
    
    async getEvaluations(contractorId: number): Promise<EvaluationResult[]> {
        const res = await fetch(`${API_URL}/evaluations/${contractorId}`, {
            headers: { ...getAuthHeaders() }
        });
        return res.json();
    },

    async getContractorFiles(contractorId: number): Promise<ContractorFile[]> {
        const res = await fetch(`${API_URL}/contractors/${contractorId}/files`, {
            headers: { ...getAuthHeaders() }
        });
        return res.json();
    },

    // Auth & User Management
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const res = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Đăng nhập thất bại');
        }
        return res.json();
    },

    async getUsers(): Promise<User[]> {
        const res = await fetch(`${API_URL}/users/`, {
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    async createUser(user: any): Promise<User> {
        const res = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(user)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to create user');
        }
        return res.json();
    },

    async updateUser(id: number, user: any): Promise<User> {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to update user');
        return res.json();
    },

    async deleteUser(id: number): Promise<void> {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error('Failed to delete user');
    },

    async changePassword(data: any): Promise<void> {
        const res = await fetch(`${API_URL}/users/me/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
             const err = await res.json();
             throw new Error(err.detail || 'Failed to change password');
        }
    }
};

export const login = api.login;
