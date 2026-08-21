'use client';

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface ParagraphComment {
  id: string;
  uid: string;
  userName: string;
  text: string;
  createdAt: Date | null;
}

export interface ParagraphCommentContext {
  storyKey: string;
  storyTitle: string;
  paragraphKey: string;
  paragraphPreview: string;
}

function commentsCollection(context: ParagraphCommentContext) {
  return collection(
    db,
    'paragraphComments',
    context.storyKey,
    'paragraphs',
    context.paragraphKey,
    'items'
  );
}

export async function loadParagraphComments(
  context: ParagraphCommentContext
): Promise<ParagraphComment[]> {
  const snap = await getDocs(
    query(commentsCollection(context), orderBy('createdAt', 'asc'), limit(100))
  );

  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    const timestamp = data.createdAt;
    return {
      id: docSnap.id,
      uid: String(data.uid || ''),
      userName: String(data.userName || 'Okur'),
      text: String(data.text || ''),
      createdAt: timestamp?.toDate?.() ?? null,
    };
  });
}

export async function submitParagraphComment(
  context: ParagraphCommentContext,
  input: { uid: string; userName: string; text: string }
): Promise<void> {
  const text = input.text.trim();
  if (!text) throw new Error('Yorum boş olamaz.');
  if (text.length > 800) throw new Error('Yorum en fazla 800 karakter olabilir.');

  // Auth sanity check — oturum ve uid eşleşmesi
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Firebase Auth oturumu bulunamadı.');
  }
  if (input.uid !== currentUser.uid) {
    throw new Error('Yorum kullanıcı kimliği Firebase Auth ile eşleşmiyor.');
  }

  // Force-refresh token before write
  await currentUser.getIdToken(true);

  try {
    await addDoc(commentsCollection(context), {
      uid: input.uid,
      userName: input.userName.slice(0, 100),
      text,
      storyTitle: context.storyTitle.slice(0, 200),
      paragraphPreview: context.paragraphPreview.slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // QA debugging: Firestore permission reddedilirse detaylı bilgi
    console.error('[paragraph-comments] Firestore write failed', {
      projectId: db.app.options.projectId,
      hasCurrentUser: Boolean(auth.currentUser),
      inputUid: input.uid,
      authUid: auth.currentUser?.uid,
      uidMatch: auth.currentUser?.uid === input.uid,
      errorCode: (err as any)?.code,
      errorMessage: (err as any)?.message,
    });
    throw err;
  }
}
