
import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import {
  api,
  BidPackage,
  Contractor,
  EvaluationResult,
  ContractorFile,
} from "../services/api";
import Spinner from "./Spinner";

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Simple markdown parser for bold (**text**) and headers (### text)
  const formatText = (text: string) => {
    // Split by newlines to handle blocks
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Handle headers
      if (line.startsWith('### ')) {
        return <h3 key={lineIdx} className="text-lg font-bold my-2 text-gem-blue">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-xl font-bold my-3 text-gem-blue">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-2xl font-bold my-4 text-gem-blue">{line.replace('# ', '')}</h1>;
      }

      // Handle bold text **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lineIdx} className="mb-1 text-gray-700 leading-relaxed">
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIdx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return <div>{formatText(content)}</div>;
};

const BidManager: React.FC = () => {
  const { 
        view, setView, 
        selectedPackage, setSelectedPackage, 
        selectedContractor, setSelectedContractor 
    } = useNavigation();

  // Evaluation step state: 'files' | 'prompts'
  const [evalStep, setEvalStep] = useState<'files' | 'prompts'>('files');

  const [packages, setPackages] = useState<BidPackage[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newPackageName, setNewPackageName] = useState("");
  const [newContractorName, setNewContractorName] = useState("");
  const [prompts, setPrompts] = useState<string>(
    "Nhà thầu có kinh nghiệm trong các dự án tương tự không?\nĐề xuất tài chính có nằm trong ngân sách không?"
  );
  const [files, setFiles] = useState<File[]>([]);
  const [evalResults, setEvalResults] = useState<any[]>([]);
  const [historyResults, setHistoryResults] = useState<EvaluationResult[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ContractorFile[]>([]);
  
  // Pagination state
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Search states
  const [packageSearch, setPackageSearch] = useState("");
  const [contractorSearch, setContractorSearch] = useState("");

  // Edit states
  const [editingPackage, setEditingPackage] = useState<BidPackage | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await api.getBidPackages();
      setPackages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!newPackageName) return;
    setLoading(true);
    await api.createBidPackage(newPackageName);
    setNewPackageName("");
    await loadPackages();
    setLoading(false);
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage || !editName) return;
    setLoading(true);
    await api.updateBidPackage(editingPackage.id, editName);
    setEditingPackage(null);
    setEditName("");
    await loadPackages();
    setLoading(false);
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa gói thầu này? Tất cả nhà thầu và dữ liệu RAG liên quan sẽ bị xóa vĩnh viễn.")) return;
    setLoading(true);
    await api.deleteBidPackage(id);
    await loadPackages();
    setLoading(false);
  };

  const handleUpdateContractor = async () => {
    if (!editingContractor || !editName || !selectedPackage) return;
    setLoading(true);
    await api.updateContractor(editingContractor.id, editName);
    setEditingContractor(null);
    setEditName("");
    const data = await api.getContractors(selectedPackage.id);
    setContractors(data);
    setLoading(false);
  };

  const handleDeleteContractor = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhà thầu này? Dữ liệu RAG liên quan sẽ bị xóa vĩnh viễn.") || !selectedPackage) return;
    setLoading(true);
    await api.deleteContractor(id);
    const data = await api.getContractors(selectedPackage.id);
    setContractors(data);
    setLoading(false);
  };

  const handleSelectPackage = async (pkg: BidPackage) => {
    setSelectedPackage(pkg);
    setLoading(true);
    const data = await api.getContractors(pkg.id);
    setContractors(data);
    setView("contractors");
    setLoading(false);
  };

  const handleCreateContractor = async () => {
    if (!newContractorName || !selectedPackage) return;
    setLoading(true);
    await api.createContractor(newContractorName, selectedPackage.id);
    setNewContractorName("");
    const data = await api.getContractors(selectedPackage.id);
    setContractors(data);
    setLoading(false);
  };

  const handleSelectContractor = async (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setView("evaluate");
    setEvalStep("files"); // Reset to files step
    loadHistory(contractor.id);
    loadFiles(contractor.id);
  };

  const loadHistory = async (id: number) => {
    const res = await api.getEvaluations(id);
    setHistoryResults(res);
  };

  const loadFiles = async (id: number) => {
    const res = await api.getContractorFiles(id);
    setProcessedFiles(res);
  };

  const handleProcessFiles = async () => {
    if (!selectedContractor || files.length === 0) return;
    setLoading(true);
    try {
        await api.processContractorFiles(selectedContractor.id, files);
        setFiles([]); // Clear selected files
        await loadFiles(selectedContractor.id); // Reload processed files
        setEvalStep("prompts"); // Move to prompts step
    } catch (e) {
        alert("Xử lý tệp thất bại: " + e);
    } finally {
        setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedContractor) return;
    setLoading(true);
    setEvalResults([]);
    try {
      const promptList = prompts.split("\n").filter((p) => p.trim());
      const res = await api.evaluateContractor(
        selectedContractor.id,
        promptList
      );
      setEvalResults(res.results);
      loadHistory(selectedContractor.id);
    } catch (e) {
      alert("Đánh giá thất bại: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Title removed as it is in Header now */}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner />
        </div>
      )}

      {view === "packages" && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Danh sách Gói thầu</h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <input
                    className="w-full sm:w-64 bg-white text-gray-800 pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gem-blue/50 focus:border-gem-blue shadow-sm transition-all"
                    placeholder="Tìm kiếm gói thầu..."
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-2 flex-1 sm:flex-initial">
                <input
                  className="w-full sm:w-64 bg-white text-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gem-blue/50 focus:border-gem-blue shadow-sm transition-all"
                  placeholder="Tên gói thầu mới..."
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                />
                <button
                  onClick={handleCreatePackage}
                  disabled={!newPackageName.trim()}
                  className="whitespace-nowrap bg-gem-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tạo mới
                </button>
              </div>
            </div>
          </div>
          
          {packages.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gem-mist border-dashed">
              <div className="text-gem-mist mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-lg text-gray-500 font-medium">Chưa có gói thầu nào</p>
              <p className="text-sm text-gray-400">Bắt đầu bằng cách tạo gói thầu mới ở trên</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase())).map((pkg) => (
                <div
                  key={pkg.id}
                  className="group bg-white p-6 rounded-xl border border-gem-mist shadow-sm hover:shadow-md hover:border-gem-blue transition-all relative overflow-hidden"
                >
                  {editingPackage?.id === pkg.id ? (
                      <div className="mb-4">
                          <input 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full border border-gem-blue rounded p-1 mb-2"
                              autoFocus
                          />
                          <div className="flex gap-2">
                              <button onClick={handleUpdatePackage} className="bg-gem-blue text-white px-2 py-1 rounded text-sm">Lưu</button>
                              <button onClick={() => setEditingPackage(null)} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">Hủy</button>
                          </div>
                      </div>
                  ) : (
                    <>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingPackage(pkg); setEditName(pkg.name); }}
                                className="p-1 text-gray-400 hover:text-gem-blue bg-white rounded-full shadow-sm"
                                title="Sửa tên"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePackage(pkg.id); }}
                                className="p-1 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm"
                                title="Xóa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <div onClick={() => handleSelectPackage(pkg)} className="cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-gem-blue rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gem-offwhite mb-1 group-hover:text-gem-blue transition-colors">{pkg.name}</h3>
                            <p className="text-sm text-gray-400">Đã tạo: {new Date(pkg.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "contractors" && selectedPackage && (
        <div>
          <button
            onClick={() => setView("packages")}
            className="mb-6 text-gray-500 hover:text-gem-blue flex items-center gap-2 transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách gói thầu
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Nhà thầu</h2>
                <p className="text-gray-500 text-sm mt-1">Gói thầu: <span className="font-semibold text-gem-blue">{selectedPackage.name}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <input
                    className="w-full sm:w-64 bg-white text-gray-800 pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gem-blue/50 focus:border-gem-blue shadow-sm transition-all"
                    placeholder="Tìm kiếm nhà thầu..."
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-2 flex-1 sm:flex-initial">
                <input
                  className="w-full sm:w-64 bg-white text-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gem-blue/50 focus:border-gem-blue shadow-sm transition-all"
                  placeholder="Tên nhà thầu mới..."
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                />
                <button
                  onClick={handleCreateContractor}
                  disabled={!newContractorName.trim()}
                  className="whitespace-nowrap bg-gem-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Thêm nhà thầu
                </button>
              </div>
            </div>
          </div>

          {contractors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gem-mist border-dashed">
              <div className="text-gem-mist mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-lg text-gray-500 font-medium">Chưa có nhà thầu nào</p>
              <p className="text-sm text-gray-400">Thêm nhà thầu tham gia gói thầu này</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contractors.filter(c => c.name.toLowerCase().includes(contractorSearch.toLowerCase())).map((c) => (
                <div
                  key={c.id}
                  className="group bg-white p-6 rounded-xl border border-gem-mist shadow-sm hover:shadow-md hover:border-gem-blue transition-all relative"
                >
                  {editingContractor?.id === c.id ? (
                      <div className="mb-4">
                          <input 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full border border-gem-blue rounded p-1 mb-2"
                              autoFocus
                          />
                          <div className="flex gap-2">
                              <button onClick={handleUpdateContractor} className="bg-gem-blue text-white px-2 py-1 rounded text-sm">Lưu</button>
                              <button onClick={() => setEditingContractor(null)} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">Hủy</button>
                          </div>
                      </div>
                  ) : (
                    <>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingContractor(c); setEditName(c.name); }}
                                className="p-1 text-gray-400 hover:text-gem-blue bg-white rounded-full shadow-sm"
                                title="Sửa tên"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteContractor(c.id); }}
                                className="p-1 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm"
                                title="Xóa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <div onClick={() => handleSelectContractor(c)} className="cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gem-offwhite group-hover:text-gem-blue transition-colors">{c.name}</h3>
                                    <p className="text-xs text-gray-400">Nhấn để đánh giá</p>
                                </div>
                            </div>
                        </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "evaluate" && selectedContractor && (
        <div>
          <button
            onClick={() => setView("contractors")}
            className="mb-6 text-gem-blue hover:text-blue-600 flex items-center gap-2 transition-colors font-bold text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách nhà thầu
          </button>
          <h2 className="text-xl mb-4">Đánh giá {selectedContractor.name}</h2>

          {processedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Tệp đã xử lý</h3>
              <div className="bg-gem-light/5 rounded border border-gem-mist/20 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold">
                    <tr>
                      <th className="px-4 py-3">Tên tệp</th>
                      <th className="px-4 py-3">Trạng thái Gemini</th>
                      <th className="px-4 py-3">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedFiles.map((file) => (
                      <tr
                        key={file.id}
                        className="border-b border-gem-mist/10 last:border-0"
                      >
                        <td className="px-4 py-2">{file.filename}</td>
                        <td className="px-4 py-2">
                          {file.is_stored_in_gemini ? (
                            <span className="text-green-400 flex items-center gap-1">
                              ✓ Đã lưu
                            </span>
                          ) : (
                            <span className="text-yellow-400">Đang chờ</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-400">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mb-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                <button 
                    onClick={() => setEvalStep('files')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${evalStep === 'files' ? 'bg-gem-blue text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    1. Tải lên & Xử lý tệp
                </button>
                <div className="h-px w-8 bg-gray-300"></div>
                <button 
                    onClick={() => {
                        if (selectedContractor.gemini_store_name) setEvalStep('prompts');
                        else alert("Vui lòng xử lý tệp trước khi đánh giá.");
                    }}
                    disabled={!selectedContractor.gemini_store_name}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${evalStep === 'prompts' ? 'bg-gem-blue text-white' : 'text-gray-500 hover:bg-gray-100 disabled:opacity-50'}`}
                >
                    2. Đánh giá AI
                </button>
            </div>

            {evalStep === 'files' && (
                <div className="space-y-6">
                    <div>
                    <label className="block mb-2 font-semibold text-gray-700">Tải lên Hồ sơ đề xuất (PDF)</label>
                    <div className="relative group">
                        <input
                        type="file"
                        multiple
                        id="file-upload"
                        onChange={(e) => {
                            if (e.target.files) {
                                setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                            }
                        }}
                        className="hidden"
                        />
                        <label 
                            htmlFor="file-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gem-blue border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gem-blue" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                </svg>
                                <p className="mb-2 text-sm text-gray-700"><span className="font-semibold text-gem-blue">Nhấn để tải lên</span> hoặc kéo thả vào đây</p>
                                <p className="text-xs text-gray-500">PDF (Tối đa 10MB)</p>
                            </div>
                        </label>
                    </div>
                    
                    {files.length > 0 && (
                        <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Tệp đã chọn:</p>
                        <div className="grid grid-cols-1 gap-2">
                            {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="flex items-center gap-3 overflow-hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                                <button
                                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Xóa tệp"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                </button>
                            </div>
                            ))}
                        </div>
                        </div>
                    )}
                    </div>

                    <button
                        onClick={handleProcessFiles}
                        disabled={files.length === 0}
                        className="bg-gem-blue text-white px-6 py-3 rounded-lg w-full font-bold shadow-md hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Lưu vào RAG & Tiếp tục
                    </button>
                    
                    {selectedContractor.gemini_store_name && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-green-800 font-medium">Dữ liệu RAG đã sẵn sàng</p>
                                <p className="text-green-600 text-sm">Bạn có thể chuyển sang bước Đánh giá AI ngay bây giờ.</p>
                            </div>
                            <button 
                                onClick={() => setEvalStep('prompts')}
                                className="ml-auto text-green-700 hover:text-green-900 font-medium text-sm underline"
                            >
                                Đi tới Đánh giá &rarr;
                            </button>
                        </div>
                    )}
                </div>
            )}

            {evalStep === 'prompts' && (
                <div className="space-y-6">
                    <div>
                    <label className="block mb-2 font-semibold text-gray-700">Tiêu chí đánh giá (Mỗi dòng một tiêu chí)</label>
                    <textarea
                        className="w-full h-48 bg-white text-gray-800 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gem-blue focus:border-transparent shadow-sm"
                        value={prompts}
                        onChange={(e) => setPrompts(e.target.value)}
                        placeholder="Nhập các câu hỏi hoặc tiêu chí đánh giá..."
                    />
                    </div>
                    <button
                    onClick={handleEvaluate}
                    className="bg-gem-blue text-white px-6 py-3 rounded-lg w-full font-bold shadow-md hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Chạy đánh giá AI
                    </button>
                </div>
            )}
          </div>

          {evalResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Kết quả hiện tại</h3>
              <div className="space-y-4">
                {evalResults.map((res, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="font-bold text-gem-blue mb-3 text-lg border-b border-gray-100 pb-2">{res.prompt}</p>
                    <div className="text-gray-700">
                        <MarkdownRenderer content={res.result || res.error} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historyResults.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Lịch sử</h3>
                <button
                  onClick={() => {
                    const cleanMarkdown = (text: string) => {
                      return text
                        .replace(/SCORE:?\s*\d+/gi, '')
                        .replace(/EXPLANATION:?/gi, '')
                        .replace(/[*#_`]/g, '')
                        .trim();
                    };

                    // Create HTML table for Excel
                    const tableContent = `
                      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                      <head>
                        <meta charset="utf-8" />
                        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Evaluation Results</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
                        <style>
                          td { vertical-align: top; padding: 5px; }
                          .wrap-text { white-space: pre-wrap; word-wrap: break-word; }
                        </style>
                      </head>
                      <body>
                        <table border="1">
                          <thead>
                            <tr style="background-color: #f0f0f0; font-weight: bold;">
                              <th style="width: 150px;">Contractor</th>
                              <th style="width: 200px;">Criteria</th>
                              <th style="width: 80px;">Score</th>
                              <th style="width: 400px;">Explanation</th>
                              <th style="width: 100px;">Conclusion</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${historyResults.map(r => `
                              <tr>
                                <td>${selectedContractor.name}</td>
                                <td>${r.criteria_prompt}</td>
                                <td style="text-align: center;">${r.score}</td>
                                <td class="wrap-text">${cleanMarkdown(r.comment)}</td>
                                <td style="text-align: center; color: ${r.score >= 5 ? 'green' : 'red'}; font-weight: bold;">
                                  ${r.score >= 5 ? 'Đạt' : 'Không đạt'}
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </body>
                      </html>
                    `;

                    const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `evaluation_${selectedContractor.name}.xls`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Export CSV
                </button>
              </div>
              <div className="space-y-4">
                {historyResults
                  .slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)
                  .map((res) => (
                  <div
                    key={res.id}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <p className="font-bold text-gem-blue mb-3 text-lg border-b border-gray-100 pb-2">
                      {res.criteria_prompt}
                    </p>
                    <div className="text-gray-700">
                        <MarkdownRenderer content={res.comment} />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Điểm số:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${res.score >= 8 ? 'bg-green-100 text-green-700' : res.score >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {res.score}/10
                        </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {historyResults.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                    >
                        Trước
                    </button>
                    <span className="text-gray-600">
                        Trang {historyPage} / {Math.ceil(historyResults.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                        onClick={() => setHistoryPage(p => Math.min(Math.ceil(historyResults.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={historyPage === Math.ceil(historyResults.length / ITEMS_PER_PAGE)}
                        className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                    >
                        Sau
                    </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BidManager;
