import React from 'react';
import { UploadedFile } from '../types';

interface FileListModalProps {
    files: UploadedFile[];
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
}

const FileListModal: React.FC<FileListModalProps> = ({ files, isOpen, onClose, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gem-onyx border border-gem-mist/20 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gem-mist/10">
                    <h2 className="text-xl font-semibold text-gem-offwhite">Tệp đã tải lên</h2>
                    <button 
                        onClick={onClose}
                        className="text-gem-mist hover:text-gem-offwhite transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gem-blue"></div>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-8 text-gem-mist">
                            Không tìm thấy tệp nào.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {files.map((file) => (
                                <div key={file.name} className="flex items-center p-4 bg-gem-mist/5 rounded-lg border border-gem-mist/10 hover:border-gem-blue/30 transition-colors">
                                    <div className="mr-4 text-gem-blue">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gem-offwhite truncate" title={file.displayName}>
                                            {file.displayName}
                                        </h3>
                                        <p className="text-xs text-gem-mist mt-1">
                                            {file.mimeType} • {(parseInt(file.sizeBytes) / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <div className="text-xs text-gem-mist/70">
                                        {new Date(file.createTime).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-gem-mist/10 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gem-mist/10 hover:bg-gem-mist/20 text-gem-offwhite rounded-lg transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileListModal;
