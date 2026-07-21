import { Message } from '@/lib/api/chat';
import { ChatOutboxItem, ChatRepository } from './chatRepository.types';

const DATABASE_NAME = 'mydream-chat-v1';
const KEY_ID = 'content-key-v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type EncryptedValue = {
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
};

type MessageRecord = EncryptedValue & {
  id: string;
};

type OutboxRecord = EncryptedValue & {
  id: string;
  accountId: number;
  conversationId: number;
};

let databasePromise: Promise<IDBDatabase> | null = null;
let keyPromise: Promise<CryptoKey> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function database(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('keys');
      db.createObjectStore('messages', { keyPath: 'id' });
      const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
      outbox.createIndex('conversation', ['accountId', 'conversationId']);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function contentKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    const db = await database();
    const read = db.transaction('keys', 'readonly');
    const readDone = transactionDone(read);
    const existing = await requestResult(read.objectStore('keys').get(KEY_ID)) as CryptoKey | undefined;
    await readDone;
    if (existing) return existing;

    // CryptoKey is stored by IndexedDB structured clone and is deliberately
    // non-extractable, so key material is never serialized as plaintext.
    const generated = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    const write = db.transaction('keys', 'readwrite');
    const writeDone = transactionDone(write);
    write.objectStore('keys').put(generated, KEY_ID);
    await writeDone;
    return generated;
  })();
  return keyPromise;
}

async function encrypt(value: unknown): Promise<EncryptedValue> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    await contentKey(),
    encoder.encode(JSON.stringify(value)),
  );
  return { iv: ivBytes.buffer.slice(0) as ArrayBuffer, ciphertext };
}

async function decrypt<T>(value: EncryptedValue): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(value.iv) },
    await contentKey(),
    value.ciphertext,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

const messageKey = (accountId: number, conversationId: number) => `${accountId}:${conversationId}`;
const outboxKey = (accountId: number, clientMessageId: string) => `${accountId}:${clientMessageId}`;

export const chatRepository: ChatRepository = {
  async loadMessages(accountId, conversationId) {
    const db = await database();
    const transaction = db.transaction('messages', 'readonly');
    const done = transactionDone(transaction);
    const record = await requestResult(transaction.objectStore('messages').get(
      messageKey(accountId, conversationId),
    )) as MessageRecord | undefined;
    await done;
    if (!record) return [];
    try {
      return await decrypt<Message[]>(record);
    } catch {
      return [];
    }
  },

  async saveMessages(accountId, conversationId, items) {
    const encrypted = await encrypt(items.slice(-500));
    const db = await database();
    const transaction = db.transaction('messages', 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore('messages').put({
      id: messageKey(accountId, conversationId),
      ...encrypted,
    } satisfies MessageRecord);
    await done;
  },

  async enqueue(item) {
    const encrypted = await encrypt(item);
    const db = await database();
    const transaction = db.transaction('outbox', 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore('outbox').put({
      id: outboxKey(item.accountId, item.clientMessageId),
      accountId: item.accountId,
      conversationId: item.conversationId,
      ...encrypted,
    } satisfies OutboxRecord);
    await done;
  },

  async removeFromOutbox(accountId, clientMessageId) {
    const db = await database();
    const transaction = db.transaction('outbox', 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore('outbox').delete(outboxKey(accountId, clientMessageId));
    await done;
  },

  async listOutbox(accountId, conversationId) {
    const db = await database();
    const transaction = db.transaction('outbox', 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(transaction.objectStore('outbox')
      .index('conversation')
      .getAll(IDBKeyRange.only([accountId, conversationId]))) as OutboxRecord[];
    await done;
    const items = await Promise.all(records.map(async record => {
      try {
        return await decrypt<ChatOutboxItem>(record);
      } catch {
        return null;
      }
    }));
    return items
      .filter((item): item is ChatOutboxItem => item !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
};
