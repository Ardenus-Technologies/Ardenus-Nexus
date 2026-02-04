import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { tagQueries, generateId } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tags = tagQueries.findAll.all();
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create tags
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, color = '#ffffff' } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  const id = generateId();
  tagQueries.create.run(id, name, color);

  const tag = tagQueries.findById.get(id);
  return NextResponse.json(tag, { status: 201 });
}
