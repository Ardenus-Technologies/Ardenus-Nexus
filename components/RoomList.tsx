"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Room } from "@/types";

interface RoomListProps {
  rooms: Room[];
  currentUserId: string;
  isAdmin: boolean;
  isClockedIn: boolean;
  onJoin: (roomId: string) => Promise<string | null>;
  onLeave: (roomId: string) => Promise<void>;
  onCreate: (name: string, meetLink: string) => Promise<void>;
  onEdit: (id: string, name: string, meetLink: string) => Promise<void>;
  onDelete: (id: string, confirmation: string) => Promise<void>;
}

export function RoomList({
  rooms,
  currentUserId,
  isAdmin,
  isClockedIn,
  onJoin,
  onLeave,
  onCreate,
  onEdit,
  onDelete,
}: RoomListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");
  const [editName, setEditName] = useState("");
  const [editMeetLink, setEditMeetLink] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (newName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onCreate(newName.trim(), newMeetLink.trim());
        setNewName("");
        setNewMeetLink("");
        setIsAdding(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleStartEdit = (room: Room) => {
    setEditingId(room.id);
    setEditName(room.name);
    setEditMeetLink(room.meetLink || "");
    setDeletingId(null);
    setDeleteConfirmation("");
  };

  const handleSaveEdit = async () => {
    if (editingId && editName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onEdit(editingId, editName.trim(), editMeetLink.trim());
        setEditingId(null);
        setEditName("");
        setEditMeetLink("");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleStartDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmation("");
    setError("");
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingId && !isSubmitting) {
      if (deleteConfirmation !== "delete this room") {
        setError('Please type "delete this room" to confirm');
        return;
      }
      setIsSubmitting(true);
      try {
        await onDelete(deletingId, deleteConfirmation);
        setDeletingId(null);
        setDeleteConfirmation("");
        setError("");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleJoin = async (roomId: string) => {
    const meetLink = await onJoin(roomId);
    if (meetLink) {
      window.open(meetLink, "_blank");
    }
  };

  return (
    <Card hover={false}>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-heading-3 font-heading">Rooms</h2>
        {isAdmin && !isAdding && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            Add Room
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="popLayout">
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pb-4 mb-4 border-b border-white/10"
            >
              <Input
                placeholder="Room name"
                aria-label="Room name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Google Meet link (optional)"
                aria-label="Google Meet link"
                value={newMeetLink}
                onChange={(e) => setNewMeetLink(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} variant="primary" size="sm" isLoading={isSubmitting}>
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName("");
                    setNewMeetLink("");
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

        {rooms.length === 0 ? (
          <p className="text-white/50 text-center py-8">
            No rooms yet{isAdmin ? ". Click Add Room to create one." : "."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {rooms.map((room) => {
                const isInRoom = room.participants.some(
                  (p) => p.userId === currentUserId
                );

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 border border-white/10 rounded-lg bg-white/5 group"
                  >
                    {editingId === room.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Room name"
                          autoFocus
                        />
                        <Input
                          value={editMeetLink}
                          onChange={(e) => setEditMeetLink(e.target.value)}
                          placeholder="Google Meet link (optional)"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveEdit}
                            variant="primary"
                            size="sm"
                            isLoading={isSubmitting}
                          >
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
                    ) : deletingId === room.id ? (
                      <div className="space-y-3">
                        <p className="text-white/70 text-sm">
                          Type{" "}
                          <span className="text-white font-mono">
                            &quot;delete this room&quot;
                          </span>{" "}
                          to confirm deletion of{" "}
                          <span className="text-white">{room.name}</span>
                        </p>
                        <Input
                          value={deleteConfirmation}
                          onChange={(e) => {
                            setDeleteConfirmation(e.target.value);
                            setError("");
                          }}
                          placeholder="delete this room"
                          aria-label="Type delete this room to confirm"
                          autoFocus
                        />
                        {error && (
                          <p className="text-red-400 text-sm" role="alert">{error}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleConfirmDelete}
                            variant="primary"
                            size="sm"
                            isLoading={isSubmitting}
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
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{room.name}</h3>
                            {room.meetLink && (
                              <svg
                                className="w-4 h-4 text-white/50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                role="img"
                                aria-label="Has Meet link"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(room)}
                                aria-label={`Edit room ${room.name}`}
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
                                onClick={() => handleStartDelete(room.id)}
                                aria-label={`Delete room ${room.name}`}
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

                        <p className="text-white/50 text-sm mb-3">
                          {room.participants.length === 0
                            ? "Empty"
                            : `${room.participants.length} ${room.participants.length === 1 ? "person" : "people"}`}
                        </p>

                        {room.participants.length > 0 && (
                          <p className="text-white/50 text-sm mb-3 truncate">
                            {room.participants
                              .map((p) => p.userName)
                              .join(", ")}
                          </p>
                        )}

                        {isInRoom ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onLeave(room.id)}
                            className="w-full"
                          >
                            Leave
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleJoin(room.id)}
                            className="w-full"
                            disabled={!isClockedIn}
                            title={!isClockedIn ? "Clock in to join" : undefined}
                          >
                            {isClockedIn ? "Join" : "Clock in to join"}
                          </Button>
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
