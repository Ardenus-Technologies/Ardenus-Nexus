"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { generateId } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  isAdmin?: boolean;
}

const PRESET_COLORS = [
  "#ffffff",
  "#a0a0a0",
  "#737373",
  "#525252",
  "#404040",
];

export function CategoryManager({
  categories,
  onAddCategory,
  onDeleteCategory,
  isAdmin = false,
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddCategory({
        id: generateId(),
        name: newName.trim(),
        color: selectedColor,
      });
      setNewName("");
      setSelectedColor(PRESET_COLORS[0]);
      setIsAdding(false);
    }
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteCategory(id);
    setDeletingId(null);
  };

  return (
    <Card hover={false}>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-heading-3 font-heading">Categories</h2>
        {isAdmin && !isAdding && (
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pb-4 border-b border-white/10"
              onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
            >
              <Input
                placeholder="Category name"
                aria-label="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-eyebrow self-center mr-2">Color</span>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                    className={`w-11 h-11 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      selectedColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm">
                  Save
                </Button>
                <Button
                  type="button"
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
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="py-2 group"
              >
                {deletingId === category.id ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white/70 text-sm">Delete {category.name}?</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmDelete(category.id)}
                        variant="primary"
                        size="sm"
                        className="bg-red-600 border-red-600 hover:bg-transparent hover:text-red-400"
                      >
                        Delete
                      </Button>
                      <Button
                        onClick={() => setDeletingId(null)}
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
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1">{category.name}</span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(category.id)}
                        aria-label={`Delete category ${category.name}`}
                        className="opacity-60 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
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
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
