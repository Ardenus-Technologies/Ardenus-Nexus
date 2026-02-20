import { NextResponse } from 'next/server';
import { auth, hashPassword } from '@/lib/auth';
import { userQueries, generateId } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = userQueries.findAll.all();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, name, password, role = 'user', department = 'development' } = body;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: 'Email, name, and password are required' },
      { status: 400 }
    );
  }

  if (department !== 'sales' && department !== 'development') {
    return NextResponse.json(
      { error: 'Department must be sales or development' },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = userQueries.findByEmail.get(email);
  if (existing) {
    return NextResponse.json(
      { error: 'Email already in use' },
      { status: 400 }
    );
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);

  userQueries.create.run(id, email, name, passwordHash, role, department);

  return NextResponse.json(
    { id, email, name, role, department },
    { status: 201 }
  );
}
