import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { Account } from '../ledger/account.entity';
import { Entry, Transaction } from '../ledger/transaction.entity';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'ledger_user',
    password: process.env.POSTGRES_PASSWORD || 'ledger_password',
    database: process.env.POSTGRES_DB || 'ledger_db',
    entities: [Transaction, Entry, Account, IdempotencyKey],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
});
