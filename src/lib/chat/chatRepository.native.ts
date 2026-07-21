import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Message } from '@/lib/api/chat';
import { ChatOutboxItem, ChatRepository } from './chatRepository.types';

const DATABASE_NAME = 'mydream-chat.db';
const DATABASE_KEY_NAME = 'mydream.chat.database-key.v1';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function databaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const generated = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return generated;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const key = await databaseKey();
    await database.execAsync(`
      PRAGMA key = '${key}';
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS chat_messages (
        account_id INTEGER NOT NULL,
        conversation_id INTEGER NOT NULL,
        message_id TEXT NOT NULL,
        client_message_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (account_id, conversation_id, message_id)
      );
      CREATE INDEX IF NOT EXISTS chat_messages_timeline
        ON chat_messages (account_id, conversation_id, created_at, message_id);
      CREATE TABLE IF NOT EXISTS chat_outbox (
        account_id INTEGER NOT NULL,
        conversation_id INTEGER NOT NULL,
        client_message_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (account_id, client_message_id)
      );
      CREATE INDEX IF NOT EXISTS chat_outbox_conversation
        ON chat_outbox (account_id, conversation_id, created_at);
    `);
    return database;
  })();
  return databasePromise;
}

export const chatRepository: ChatRepository = {
  async loadMessages(accountId, conversationId) {
    const database = await openDatabase();
    const rows = await database.getAllAsync<{ payload: string }>(
      `SELECT payload FROM chat_messages
       WHERE account_id = ? AND conversation_id = ?
       ORDER BY created_at ASC, message_id ASC
       LIMIT 500`,
      accountId,
      conversationId,
    );
    return rows.flatMap(row => {
      try {
        return [JSON.parse(row.payload) as Message];
      } catch {
        return [];
      }
    });
  },

  async saveMessages(accountId, conversationId, items) {
    const database = await openDatabase();
    const bounded = items.slice(-500);
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        'DELETE FROM chat_messages WHERE account_id = ? AND conversation_id = ?',
        accountId,
        conversationId,
      );
      for (const message of bounded) {
        await database.runAsync(
          `INSERT INTO chat_messages
           (account_id, conversation_id, message_id, client_message_id, created_at, payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
          accountId,
          conversationId,
          message.message_id,
          message.client_message_id,
          message.created_at,
          JSON.stringify(message),
        );
      }
    });
  },

  async enqueue(item) {
    const database = await openDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO chat_outbox
       (account_id, conversation_id, client_message_id, created_at, payload)
       VALUES (?, ?, ?, ?, ?)`,
      item.accountId,
      item.conversationId,
      item.clientMessageId,
      item.createdAt,
      JSON.stringify(item),
    );
  },

  async removeFromOutbox(accountId, clientMessageId) {
    const database = await openDatabase();
    await database.runAsync(
      'DELETE FROM chat_outbox WHERE account_id = ? AND client_message_id = ?',
      accountId,
      clientMessageId,
    );
  },

  async listOutbox(accountId, conversationId) {
    const database = await openDatabase();
    const rows = await database.getAllAsync<{ payload: string }>(
      `SELECT payload FROM chat_outbox
       WHERE account_id = ? AND conversation_id = ?
       ORDER BY created_at ASC`,
      accountId,
      conversationId,
    );
    return rows.flatMap(row => {
      try {
        return [JSON.parse(row.payload) as ChatOutboxItem];
      } catch {
        return [];
      }
    });
  },
};
