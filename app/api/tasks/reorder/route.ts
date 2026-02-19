import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskQueries, getDb } from '@/lib/db';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { taskIds } = body;

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: 'taskIds must be a non-empty array' }, { status: 400 });
  }

  const db = getDb();
  const updateMany = db.transaction((ids: string[]) => {
    for (let i = 0; i < ids.length; i++) {
      taskQueries.updatePosition.run(i, ids[i]);
    }
  });

  updateMany(taskIds);

  return NextResponse.json({ success: true });
}
