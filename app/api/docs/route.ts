import { NextResponse } from 'next/server';
import { listDocuments, getDocument, searchDocuments } from '@/lib/docs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  
  if (id) {
    const doc = getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  }
  
  const docs = search ? searchDocuments(search) : listDocuments();
  return NextResponse.json(docs);
}
