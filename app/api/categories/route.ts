import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { categoryQueries, generateId } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = categoryQueries.findAll.all();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || !color) {
    return NextResponse.json(
      { error: 'Name and color are required' },
      { status: 400 }
    );
  }

  const id = generateId();
  categoryQueries.create.run(id, name, color);

  const category = categoryQueries.findById.get(id);
  return NextResponse.json(category, { status: 201 });
}
