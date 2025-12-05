import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Spinner from './Spinner';

interface Stats {
  total_packages: number;
  total_contractors: number;
  total_evaluations: number;
  total_files: number;
  total_storage_mb: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
}

const Reports: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/reports/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;
  if (!stats) return <div className="text-center p-10">Không có dữ liệu báo cáo</div>;

  const tokenData = [
    { name: 'Input Tokens', value: stats.total_input_tokens },
    { name: 'Output Tokens', value: stats.total_output_tokens },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Báo cáo & Thống kê</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase">Tổng chi phí ước tính</p>
          <p className="text-3xl font-bold text-gem-blue mt-2">${stats.estimated_cost_usd}</p>
          <p className="text-xs text-gray-400 mt-1">Dựa trên giá Gemini 1.5 Flash</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase">Tổng truy vấn đánh giá</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total_evaluations}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase">Dữ liệu lưu trữ</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total_storage_mb} MB</p>
          <p className="text-xs text-gray-400 mt-1">{stats.total_files} tệp đã tải lên</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium uppercase">Tổng Token</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{(stats.total_input_tokens + stats.total_output_tokens).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Overview */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Tổng quan hệ thống</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Gói thầu</span>
                <span className="text-2xl font-bold text-gray-800">{stats.total_packages}</span>
             </div>
             <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Nhà thầu</span>
                <span className="text-2xl font-bold text-gray-800">{stats.total_contractors}</span>
             </div>
             <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Tệp tài liệu</span>
                <span className="text-2xl font-bold text-gray-800">{stats.total_files}</span>
             </div>
          </div>
        </div>

        {/* Token Usage Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Phân bố Token</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
