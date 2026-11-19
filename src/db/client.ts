import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { migrate } from './migrate';
import * as schema from './schema';

export const sqlite = openDatabaseSync('cadence.db');
migrate(sqlite);

export const db = drizzle(sqlite, { schema });
