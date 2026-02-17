import { NextResponse } from 'next/server';
import { listDocuments, getDocument } from '@/lib/docs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (id) {
    const doc = getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  }
  
  const docs = listDocuments();
  return NextResponse.json(docs);
}
