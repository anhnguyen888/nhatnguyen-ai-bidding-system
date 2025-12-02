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

export const api = {
    async getBidPackages(): Promise<BidPackage[]> {
        const res = await fetch(`${API_URL}/bid_packages/`);
        return res.json();
    },

    async updateBidPackage(id: number, name: string, description?: string): Promise<BidPackage> {
        const res = await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        return res.json();
    },

    async deleteBidPackage(id: number): Promise<void> {
        await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'DELETE'
        });
    },

    async createBidPackage(name: string, description?: string): Promise<BidPackage> {
        const res = await fetch(`${API_URL}/bid_packages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        return res.json();
    },

    async updateBidPackage(id: number, name: string, description?: string): Promise<BidPackage> {
        const res = await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        return res.json();
    },

    async deleteBidPackage(id: number): Promise<void> {
        await fetch(`${API_URL}/bid_packages/${id}`, {
            method: 'DELETE'
        });
    },

    async getContractors(bidPackageId: number): Promise<Contractor[]> {
        const res = await fetch(`${API_URL}/bid_packages/${bidPackageId}/contractors`);
        return res.json();
    },

    async createContractor(name: string, bidPackageId: number): Promise<Contractor> {
        const res = await fetch(`${API_URL}/contractors/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, bid_package_id: bidPackageId })
        });
        return res.json();
    },

    async updateContractor(id: number, name: string): Promise<Contractor> {
        const res = await fetch(`${API_URL}/contractors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, bid_package_id: 0 }) // bid_package_id is ignored by backend update but required by type if strictly checked, though here we just send name
        });
        return res.json();
    },

    async deleteContractor(id: number): Promise<void> {
        await fetch(`${API_URL}/contractors/${id}`, {
            method: 'DELETE'
        });
    },

    async evaluateContractor(contractorId: number, prompts: string[], files: File[]): Promise<{ status: string, results: any[] }> {
        const formData = new FormData();
        formData.append('contractor_id', contractorId.toString());
        formData.append('prompts', JSON.stringify(prompts));
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        const res = await fetch(`${API_URL}/evaluate/`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Đánh giá thất bại');
        }
        return res.json();
    },
    
    async getEvaluations(contractorId: number): Promise<EvaluationResult[]> {
        const res = await fetch(`${API_URL}/evaluations/${contractorId}`);
        return res.json();
    },

    async getContractorFiles(contractorId: number): Promise<ContractorFile[]> {
        const res = await fetch(`${API_URL}/contractors/${contractorId}/files`);
        return res.json();
    }
};
