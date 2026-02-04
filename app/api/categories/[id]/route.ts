import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { categoryQueries } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete categories
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const category = categoryQueries.findById.get(id);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  // Check if category has time entries
  const allCategories = categoryQueries.findAll.all();
  if (allCategories.length <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete the last category' },
      { status: 400 }
    );
  }

  categoryQueries.delete.run(id);
  return NextResponse.json({ success: true });
}
