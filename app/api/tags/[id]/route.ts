import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tagQueries } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update tags
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const tag = tagQueries.findById.get(id);
  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  tagQueries.update.run(name, color || tag.color, id);

  const updatedTag = tagQueries.findById.get(id);
  return NextResponse.json(updatedTag);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete tags
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const tag = tagQueries.findById.get(id);
  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  // Require confirmation text
  const body = await request.json();
  const { confirmation } = body;

  if (confirmation !== 'delete this tag') {
    return NextResponse.json(
      { error: 'Please type "delete this tag" to confirm deletion' },
      { status: 400 }
    );
  }

  tagQueries.delete.run(id);
  return NextResponse.json({ success: true });
}
