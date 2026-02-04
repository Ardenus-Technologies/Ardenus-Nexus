import { NextResponse } from 'next/server';
import { auth, hashPassword } from '@/lib/auth';
import { userQueries, timeEntryQueries, sessionQueries } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  const user = userQueries.findById.get(id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete user's sessions and time entries first (cascade)
  sessionQueries.deleteByUserId.run(id);
  timeEntryQueries.deleteByUserId.run(id);
  userQueries.delete.run(id);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Users can only update their own password, admins can update anyone
  if (id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = userQueries.findById.get(id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Handle password update
  if (body.password) {
    const passwordHash = await hashPassword(body.password);
    userQueries.updatePassword.run(passwordHash, id);
  }

  return NextResponse.json({ success: true });
}
