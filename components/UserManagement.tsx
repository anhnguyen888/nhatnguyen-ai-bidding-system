import React, { useState, useEffect } from 'react';
import { api, User } from '../services/api';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'user' });
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError('Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createUser(newUser);
            setNewUser({ username: '', full_name: '', password: '', role: 'user' });
            setShowAddForm(false);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Tạo người dùng thất bại');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            await api.deleteUser(id);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Xóa người dùng thất bại');
        }
    };

    if (loading) return <div className="text-center p-4">Đang tải...</div>;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                    {showAddForm ? 'Hủy' : 'Thêm người dùng'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-4 rounded shadow mb-6">
                    <h2 className="text-xl font-bold mb-4">Thêm người dùng mới</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                            <input
                                type="text"
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                            <input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Lưu
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên đăng nhập</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-600 hover:text-red-900 ml-4"
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
