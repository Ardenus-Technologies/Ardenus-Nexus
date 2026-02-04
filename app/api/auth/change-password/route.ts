import { NextResponse } from 'next/server';
import { auth, hashPassword, verifyPassword } from '@/lib/auth';
import { userQueries } from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'New password must be at least 6 characters' },
      { status: 400 }
    );
  }

  // Get user from database
  const user = userQueries.findById.get(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  // Hash new password and update
  const newPasswordHash = await hashPassword(newPassword);
  userQueries.updatePassword.run(newPasswordHash, session.user.id);

  return NextResponse.json({ success: true });
}
