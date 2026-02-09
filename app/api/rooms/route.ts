import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { roomQueries, roomParticipantQueries, generateId } from '@/lib/db';
import type { Room } from '@/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rooms = roomQueries.findAll.all();
  const participants = roomParticipantQueries.findAllWithUsers.all();

  const result: Room[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    meetLink: room.meet_link,
    requireClockIn: Boolean(room.require_clock_in),
    participants: participants
      .filter((p) => p.room_id === room.id)
      .map((p) => ({
        userId: p.user_id,
        userName: p.user_name,
        joinedAt: p.joined_at,
      })),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, meetLink, requireClockIn } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const id = generateId();
  roomQueries.create.run(id, name.trim(), meetLink || null, requireClockIn === false ? 0 : 1);

  const room = roomQueries.findById.get(id);
  return NextResponse.json(
    {
      id: room!.id,
      name: room!.name,
      meetLink: room!.meet_link,
      requireClockIn: Boolean(room!.require_clock_in),
      participants: [],
    } as Room,
    { status: 201 }
  );
}
