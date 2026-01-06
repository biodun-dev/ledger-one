import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { Account } from './account.entity';
import { CreateEntryDto, CreateTransactionDto } from './ledger.dto';
import { Entry, EntryType, Transaction } from './transaction.entity';

@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    constructor(
        @InjectDataSource()
        private dataSource: DataSource,
    ) { }

    async createTransaction(dto: CreateTransactionDto, idempotencyKey: string): Promise<Transaction> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        // Use SERIALIZABLE for strict consistency in financial transactions
        await queryRunner.startTransaction('SERIALIZABLE');

        try {
            const manager = queryRunner.manager;

            // 1. Check Idempotency
            if (idempotencyKey) {
                // Lock the idempotency key row to prevent race conditions from concurrent requests with valid keys
                const existingKey = await manager.findOne(IdempotencyKey, {
                    where: { key: idempotencyKey },
                    lock: { mode: 'pessimistic_write' }
                });

                if (existingKey) {
                    if (existingKey.response) {
                        this.logger.log(`Idempotency hit for key: ${idempotencyKey}`);
                        // If response exists, return it immediately. The transaction was already successful.
                        await queryRunner.rollbackTransaction(); // Rollback current logic transaction as we are just reading
                        return existingKey.response;
                    } else {
                        // Key exists but no response. This implies an in-progress transaction or a previous crash.
                        // We assume it's in progress.
                        await queryRunner.rollbackTransaction();
                        throw new ConflictException('Transaction with this Idempotency-Key is currently in progress. Please retry later.');
                    }
                } else {
                    // Reserve the key. 
                    // If a concurrent request tries to insert the same key here, one will fail with unique constraint violation.
                    await manager.insert(IdempotencyKey, { key: idempotencyKey, created_at: new Date() });
                }
            }

            // 2. Validate Entries Balance
            this.validateBalance(dto.entries);

            // 3. Prepare Transaction Data
            const transaction = new Transaction();
            transaction.description = dto.description;
            transaction.reference = dto.reference;
            transaction.entries = [];

            // Sort entries by account ID to ensure consistent locking order and prevent deadlocks
            const entries = [...dto.entries].sort((a, b) => a.accountId.localeCompare(b.accountId));

            for (const entryDto of entries) {
                // Lock each account with pessimistic_write to ensure exclusive access during this transaction
                const account = await manager.findOne(Account, {
                    where: { id: entryDto.accountId },
                    lock: { mode: 'pessimistic_write' }
                });

                if (!account) {
                    throw new NotFoundException(`Account ${entryDto.accountId} not found`);
                }

                // Calculate new balance based on entry type
                let newBalance = Number(account.balance);
                if (entryDto.type === EntryType.DEBIT) {
                    newBalance += Number(entryDto.amount);
                } else {
                    newBalance -= Number(entryDto.amount);
                }

                // Enforce non-negative balance constraint
                if (newBalance < 0) {
                    throw new BadRequestException({
                        message: 'Insufficient funds',
                        accountId: account.id,
                        currentBalance: account.balance,
                        attemptedAmount: entryDto.amount,
                        type: entryDto.type
                    });
                }

                // Update Account
                account.balance = newBalance;
                await manager.save(Account, account);

                // Create Entry Record
                const entry = new Entry();
                entry.amount = entryDto.amount;
                entry.type = entryDto.type;
                entry.account = account;
                transaction.entries.push(entry);
            }

            // 4. Save the Transaction and its Entries
            const savedTransaction = await manager.save(Transaction, transaction);

            // 5. Update Idempotency Key with Response
            if (idempotencyKey) {
                await manager.update(IdempotencyKey, { key: idempotencyKey }, { response: savedTransaction });
            }

            // 6. Commit
            await queryRunner.commitTransaction();
            this.logger.log(`Transaction successfully created: ${savedTransaction.id}`);
            return savedTransaction;

        } catch (err) {
            await queryRunner.rollbackTransaction();

            // Handle Postgres Serialization Failure
            if (err.code === '40001') {
                this.logger.warn(`Concurrency conflict (Serialization Failure) for idempotency key ${idempotencyKey}`);
                throw new ConflictException('Transaction failed due to concurrent modification. Please retry.');
            }

            // Handle Unique Violation (specifically for Idempotency Key race conditions)
            if (err.code === '23505') {
                this.logger.warn(`Unique constraint violation for idempotency key ${idempotencyKey}`);
                throw new ConflictException('Transaction was already processed or is being processed.');
            }

            this.logger.error(`Transaction processing failed: ${err.message}`, err.stack);

            // Re-throw NestJS exceptions as-is
            if (err instanceof BadRequestException || err instanceof ConflictException || err instanceof NotFoundException) {
                throw err;
            }
            throw new ServiceUnavailableException('Internal server error during transaction processing');
        } finally {
            await queryRunner.release();
        }
    }

    private validateBalance(entries: CreateEntryDto[]) {
        let debits = 0;
        let credits = 0;

        for (const entry of entries) {
            if (entry.type === EntryType.DEBIT) {
                debits += entry.amount;
            } else {
                credits += entry.amount;
            }
        }

        // Check strict equality allowing for minor floating point diffs
        if (Math.abs(debits - credits) > 0.0001) {
            throw new BadRequestException(`Invalid Transaction: Debits (${debits}) do not equal Credits (${credits}). Double-entry requires a balanced transaction.`);
        }
    }

    async createAccount(name: string): Promise<Account> {
        try {
            const account = new Account();
            account.name = name;
            return await this.dataSource.getRepository(Account).save(account);
        } catch (err) {
            if (err.code === '23505') {
                throw new ConflictException(`Account with name '${name}' already exists.`);
            }
            throw err;
        }
    }

    async getBalances(): Promise<Account[]> {
        return this.dataSource.getRepository(Account).find();
    }

    async getTransactions(): Promise<Transaction[]> {
        return this.dataSource.getRepository(Transaction).find({
            relations: ['entries', 'entries.account'],
            order: { created_at: 'DESC' }
        });
    }
}
