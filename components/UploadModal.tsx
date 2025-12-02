/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import CarIcon from './icons/CarIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import Spinner from './Spinner';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const sampleDocuments = [
    {
        name: 'Hyundai i10 Manual',
        url: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/connect-to-service/owners-manual/2025/i20&i20nlineFromOct2023-Present.pdf',
        icon: <CarIcon />,
        fileName: 'hyundai-i10-manual.pdf'
    },
    {
        name: 'LG Washer Manual',
        url: 'https://www.lg.com/us/support/products/documents/WM2077CW.pdf',
        icon: <WashingMachineIcon />,
        fileName: 'lg-washer-manual.pdf'
    }
];

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleSelectSample = async (name: string, url: string, fileName: string) => {
        if (loadingSample) return;
        setLoadingSample(name);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            setFiles(prev => [...prev, file]);
        } catch (error) {
            console.error("Error fetching sample file:", error);
            alert(`Không thể tải tài liệu mẫu. Điều này có thể do chính sách CORS. Vui lòng thử tải lên tệp cục bộ.`);
        } finally {
            setLoadingSample(null);
        }
    };

    const handleClose = () => {
        setFiles([]);
        onClose();
    }

    const handleConfirmUpload = () => {
        onUpload(files);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="bg-gem-slate p-8 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 relative overflow-hidden border border-gem-mist">
                <h2 id="upload-title" className="text-2xl font-bold text-gem-offwhite mb-6">Tải lên tài liệu</h2>
                
                <div 
                    className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-colors ${
                        isDragging ? 'border-gem-blue bg-gem-blue/5' : 'border-gem-mist hover:border-gem-blue/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        className="hidden" 
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="bg-gem-onyx p-4 rounded-full mb-4">
                            <UploadCloudIcon className="w-8 h-8 text-gem-blue" />
                        </div>
                        <p className="text-gem-offwhite font-medium mb-1">Nhấp để tải lên hoặc kéo và thả</p>
                        <p className="text-sm text-gray-500">Hỗ trợ PDF, TXT, MD</p>
                    </label>
                </div>

                {files.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Tệp đã chọn</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gem-onyx p-3 rounded-lg border border-gem-mist">
                                    <span className="text-sm font-medium text-gem-offwhite truncate">{file.name}</span>
                                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Hoặc thử một mẫu</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sampleDocuments.map((doc) => (
                            <button
                                key={doc.name}
                                onClick={() => handleSelectSample(doc.name, doc.url, doc.fileName)}
                                disabled={loadingSample !== null}
                                className="flex items-center p-3 rounded-lg border border-gem-mist hover:border-gem-blue hover:bg-gem-blue/5 transition-all text-left group"
                            >
                                <div className="p-2 bg-gem-onyx rounded-lg mr-3 group-hover:bg-white transition-colors">
                                    {loadingSample === doc.name ? <Spinner /> : doc.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gem-offwhite">{doc.name}</p>
                                    <p className="text-xs text-gray-500">PDF mẫu</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleConfirmUpload}
                        disabled={files.length === 0}
                        className={`px-5 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-gem-blue/20 transition-all ${
                            files.length === 0 
                            ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                            : 'bg-gem-blue hover:bg-blue-600 hover:shadow-blue-600/30'
                        }`}
                    >
                        Tải lên và Trò chuyện
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;