import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { roomQueries } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const room = roomQueries.findById.get(id);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, meetLink, requireClockIn } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  roomQueries.update.run(name.trim(), meetLink || null, requireClockIn === false ? 0 : 1, id);

  const updated = roomQueries.findById.get(id);
  return NextResponse.json({
    id: updated!.id,
    name: updated!.name,
    meetLink: updated!.meet_link,
    requireClockIn: Boolean(updated!.require_clock_in),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const room = roomQueries.findById.get(id);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const body = await request.json();
  const { confirmation } = body;

  if (confirmation !== 'delete this room') {
    return NextResponse.json(
      { error: 'Please type "delete this room" to confirm deletion' },
      { status: 400 }
    );
  }

  roomQueries.delete.run(id);
  return NextResponse.json({ success: true });
}
