"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Input, Card, CardHeader, CardContent } from "@/components/ui";
import { TagManager } from "@/components/TagManager";
import type { Tag } from "@/types";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  created_at: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      setError("Failed to load users");
    }
  };

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch {
      // Tags are optional
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchTags()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchTags]);

  const handleAddTag = async (tag: Omit<Tag, "id">) => {
    setError("");
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tag),
      });
      if (res.ok) {
        const newTag = await res.json();
        setTags((prev) => [...prev, newTag]);
        setSuccess("Tag created successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tag");
      }
    } catch {
      setError("Failed to create tag");
    }
  };

  const handleEditTag = async (id: string, tag: Omit<Tag, "id">) => {
    setError("");
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tag),
      });
      if (res.ok) {
        const updatedTag = await res.json();
        setTags((prev) =>
          prev.map((t) => (t.id === id ? updatedTag : t))
        );
        setSuccess("Tag updated successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tag");
      }
    } catch {
      setError("Failed to update tag");
    }
  };

  const handleDeleteTag = async (id: string, confirmation: string) => {
    setError("");
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (res.ok) {
        setTags((prev) => prev.filter((t) => t.id !== id));
        setSuccess("Tag deleted successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete tag");
      }
    } catch {
      setError("Failed to delete tag");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user");
      }
    } catch {
      setError("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
      }
    } catch {
      setError("Failed to delete user");
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("Enter new password for this user:");
    if (!newPassword) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setSuccess("Password updated successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reset password");
      }
    } catch {
      setError("Failed to reset password");
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccess("Your password has been changed successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to change password");
      }
    } catch {
      setError("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen container-margins section-py-lg">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <motion.header
          className="mb-12 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-eyebrow mb-2">Admin</p>
            <h1 className="text-display-3 font-heading">User Management</h1>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Back to Tracker
            </Button>
          </Link>
        </motion.header>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
          >
            {success}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          {/* User List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-heading-4">Users ({users.length})</h2>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/10">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-white/50">{user.email}</p>
                        <span
                          className={`text-xs uppercase tracking-wider ${
                            user.role === "admin"
                              ? "text-yellow-400"
                              : "text-white/30"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      {user.id !== session?.user.id && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user.id)}
                          >
                            Reset PW
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="p-4 text-white/50 text-center">No users found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Forms */}
          <div className="space-y-6">
            {/* Create User Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <h2 className="text-heading-4">Create User</h2>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Role
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="user"
                            checked={role === "user"}
                            onChange={() => setRole("user")}
                            className="accent-white"
                          />
                          <span>User</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="admin"
                            checked={role === "admin"}
                            onChange={() => setRole("admin")}
                            className="accent-white"
                          />
                          <span>Admin</span>
                        </label>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmitting}
                      className="w-full"
                    >
                      Create User
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Change Your Password */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <h2 className="text-heading-4">Change Your Password</h2>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangeOwnPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      isLoading={isChangingPassword}
                      className="w-full"
                    >
                      Change Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Tag Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <TagManager
            tags={tags}
            onAddTag={handleAddTag}
            onEditTag={handleEditTag}
            onDeleteTag={handleDeleteTag}
            isAdmin={true}
          />
        </motion.div>
      </div>
    </main>
  );
}
