import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Lock,
} from 'lucide-react';
import { UserAccessRecord } from '../../types';
import { api } from '../../lib/api';

interface UserManagementViewProps {
  users: UserAccessRecord[];
  currentUserEmail: string;
  onRefresh: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUserEmail,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Employee'>('Employee');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setActionError('Please provide a valid Google account email.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.addUser(newEmail.trim(), newRole, 'Active');
      setActionSuccess(`User ${newEmail} authorized as ${newRole} in User Access!`);
      setNewEmail('');
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserAccessRecord) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg =
      nextStatus === 'Inactive'
        ? `Are you sure you want to deactivate access for ${user.email}? They will no longer be able to log in.`
        : `Reactivate access for ${user.email}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionError(null);
    try {
      await api.updateUser(user.email, { status: nextStatus });
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user status.');
    }
  };

  const handleChangeRole = async (user: UserAccessRecord, newRole: 'Admin' | 'Employee') => {
    if (user.role === newRole) return;
    if (user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert('Security Protection: You cannot alter your own admin privileges.');
      return;
    }

    if (!window.confirm(`Change ${user.email}'s role to ${newRole}?`)) return;

    setActionError(null);
    try {
      await api.updateUser(user.email, { role: newRole });
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user role.');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Employee Access Management (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connected to <strong>User Access</strong> sheet. Only authorized Google emails can authenticate and access the system.
          </p>
        </div>

        <button
          onClick={() => {
            setNewEmail('');
            setNewRole('Employee');
            setActionError(null);
            setActionSuccess(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Authorize Google Email</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search authorized staff by Google Email or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff Email (Google Account)</th>
                <th className="px-4 py-3 font-semibold">Assigned Role</th>
                <th className="px-4 py-3 font-semibold">Account Status</th>
                <th className="px-4 py-3 font-semibold">Date Added</th>
                <th className="px-4 py-3 font-semibold text-center">Manage Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isCurrent = u.email.toLowerCase() === currentUserEmail.toLowerCase();
                  const isSuperAdmin = u.email.toLowerCase() === 'nhaque4760@gmail.com';

                  return (
                    <tr
                      key={u.email}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold dark:bg-slate-800 dark:text-slate-300">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.email}</span>
                              {isCurrent && (
                                <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  You
                                </span>
                              )}
                              {isSuperAdmin && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            {u.name && (
                              <div className="text-[11px] text-slate-400">{u.name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            u.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            u.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status === 'Active' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <UserX className="h-3 w-3" />
                          )}
                          <span>{u.status}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {u.addedOn || '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Role Switcher */}
                          {!isSuperAdmin && !isCurrent ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as any)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="Employee">Employee</option>
                              <option value="Admin">Admin</option>
                            </select>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Protected</span>
                          )}

                          {/* Status Toggle */}
                          {!isSuperAdmin && !isCurrent ? (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                                u.status === 'Active'
                                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">
                    No users found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Authorize Employee Access
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Google Account Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="employee@organization.com or @gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Must be their real Google account email to sign in via Google OAuth.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Permission Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Employee">Employee (Catalog Search, Quotations, Dispatches)</option>
                  <option value="Admin">Administrator (Full Access & User Management)</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 flex items-start gap-2">
                <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This record is appended to the <strong>User Access</strong> spreadsheet sheet. Employees cannot access the spreadsheet file directly.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newEmail.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Authorize User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
