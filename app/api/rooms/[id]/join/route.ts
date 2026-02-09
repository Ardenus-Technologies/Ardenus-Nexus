import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { roomQueries, roomParticipantQueries, activeTimerQueries, generateId } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Must be clocked in to join a room
  const activeTimer = activeTimerQueries.findByUserId.get(session.user.id);
  if (!activeTimer) {
    return NextResponse.json({ error: 'You must be clocked in to join a room' }, { status: 403 });
  }

  const room = roomQueries.findById.get(id);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Leave all rooms first (one room at a time)
  roomParticipantQueries.leaveAll.run(session.user.id);

  // Join the new room
  roomParticipantQueries.join.run(generateId(), id, session.user.id);

  return NextResponse.json({ success: true, meetLink: room.meet_link });
}
