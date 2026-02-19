import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { taskCommentQueries } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = await params;
  const comment = taskCommentQueries.findById.get(commentId);
  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Only the author or an admin can delete
  if (comment.user_id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
  }

  taskCommentQueries.delete.run(commentId);
  return NextResponse.json({ success: true });
}
