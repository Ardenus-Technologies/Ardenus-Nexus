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

  // Only admins can update name, email, and role for other users
  if (session.user.role === 'admin') {
    if (body.name && typeof body.name === 'string') {
      userQueries.updateName.run(body.name.trim(), id);
    }

    if (body.email && typeof body.email === 'string') {
      const trimmedEmail = body.email.trim().toLowerCase();
      // Check for duplicate email (but allow keeping same email)
      if (trimmedEmail !== user.email) {
        const existing = userQueries.findByEmail.get(trimmedEmail);
        if (existing) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
      }
      userQueries.updateEmail.run(trimmedEmail, id);
    }

    if (body.role && (body.role === 'user' || body.role === 'admin')) {
      // Prevent admins from demoting themselves
      if (id === session.user.id && body.role !== 'admin') {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
      }
      userQueries.updateRole.run(body.role, id);
    }

    if (body.department && (body.department === 'sales' || body.department === 'development')) {
      userQueries.updateDepartment.run(body.department, id);
    }
  }

  return NextResponse.json({ success: true });
}
