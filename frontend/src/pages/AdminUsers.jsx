import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Users, Shield, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/user/all');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.put(`/user/${id}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Consents</th>
                <th className="text-left px-4 py-3 font-medium">Data Items</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.consent_count}</td>
                  <td className="px-4 py-3">{u.data_count}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => toggleRole(u.id, u.role)}>
                      Make {u.role === 'admin' ? 'User' : 'Admin'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default AdminUsers;
