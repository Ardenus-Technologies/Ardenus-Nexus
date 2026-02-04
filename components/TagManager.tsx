"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Tag } from "@/types";

interface TagManagerProps {
  tags: Tag[];
  onAddTag: (tag: Omit<Tag, "id">) => void;
  onEditTag: (id: string, tag: Omit<Tag, "id">) => void;
  onDeleteTag: (id: string, confirmation: string) => void;
  isAdmin?: boolean;
}

const PRESET_COLORS = [
  "#ffffff",
  "#a0a0a0",
  "#737373",
  "#525252",
  "#404040",
];

export function TagManager({
  tags,
  onAddTag,
  onEditTag,
  onDeleteTag,
  isAdmin = false,
}: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      onAddTag({
        name: newName.trim(),
        color: selectedColor,
      });
      setNewName("");
      setSelectedColor(PRESET_COLORS[0]);
      setIsAdding(false);
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setDeletingId(null);
    setDeleteConfirmation("");
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onEditTag(editingId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      setEditName("");
      setEditColor("");
    }
  };

  const handleStartDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmation("");
    setError("");
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      if (deleteConfirmation !== "delete this tag") {
        setError('Please type "delete this tag" to confirm');
        return;
      }
      onDeleteTag(deletingId, deleteConfirmation);
      setDeletingId(null);
      setDeleteConfirmation("");
      setError("");
    }
  };

  return (
    <Card hover={false}>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-heading-3 font-heading">Tags</h2>
        {isAdmin && !isAdding && (
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pb-4 border-b border-white/10"
            >
              <Input
                placeholder="Tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <span className="text-eyebrow self-center mr-2">Color</span>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                    className={`w-8 h-8 rounded-full transition-all ${
                      selectedColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} variant="primary" size="sm">
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName("");
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tags.length === 0 ? (
          <p className="text-white/50 text-center py-4">
            No tags yet{isAdmin ? ". Click Add to create one." : "."}
          </p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {tags.map((tag) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="py-2 group"
                >
                  {editingId === tag.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <span className="text-eyebrow self-center mr-2">Color</span>
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            aria-label={`Select color ${color}`}
                            aria-pressed={editColor === color}
                            className={`w-6 h-6 rounded-full transition-all ${
                              editColor === color
                                ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                                : ""
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} variant="primary" size="sm">
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : deletingId === tag.id ? (
                    <div className="space-y-3">
                      <p className="text-white/70 text-sm">
                        Type <span className="text-white font-mono">&quot;delete this tag&quot;</span> to confirm deletion of <span className="text-white">{tag.name}</span>
                      </p>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => {
                          setDeleteConfirmation(e.target.value);
                          setError("");
                        }}
                        placeholder="delete this tag"
                        autoFocus
                      />
                      {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleConfirmDelete}
                          variant="primary"
                          size="sm"
                          className="bg-red-600 border-red-600 hover:bg-transparent hover:text-red-400"
                        >
                          Delete
                        </Button>
                        <Button
                          onClick={() => {
                            setDeletingId(null);
                            setDeleteConfirmation("");
                            setError("");
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1">{tag.name}</span>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(tag)}
                            aria-label={`Edit tag ${tag.name}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartDelete(tag.id)}
                            aria-label={`Delete tag ${tag.name}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
