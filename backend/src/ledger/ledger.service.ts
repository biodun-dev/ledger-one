import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { CreateEntryDto, CreateTransactionDto } from './dto/ledger.dto';
import { Account } from './entities/account.entity';
import { Entry, EntryType, Transaction } from './entities/transaction.entity';

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

            if (idempotencyKey) {
                const existingKey = await manager.findOne(IdempotencyKey, {
                    where: { key: idempotencyKey },
                    lock: { mode: 'pessimistic_write' }
                });

                if (existingKey) {
                    if (existingKey.response) {
                        this.logger.log(`Idempotency hit for key: ${idempotencyKey}`);
                        await queryRunner.rollbackTransaction();
                        return existingKey.response;
                    } else {
                        await queryRunner.rollbackTransaction();
                        throw new ConflictException('Transaction with this Idempotency-Key is currently in progress. Please retry later.');
                    }
                } else {
                    await manager.insert(IdempotencyKey, { key: idempotencyKey, created_at: new Date() });
                }
            }

            this.validateBalance(dto.entries);

            const transaction = new Transaction();
            transaction.description = dto.description;
            transaction.reference = dto.reference;
            transaction.entries = [];

            const entries = [...dto.entries].sort((a, b) => a.accountId.localeCompare(b.accountId));

            for (const entryDto of entries) {
                const account = await manager.findOne(Account, {
                    where: { id: entryDto.accountId },
                    lock: { mode: 'pessimistic_write' }
                });

                if (!account) {
                    throw new NotFoundException(`Account ${entryDto.accountId} not found`);
                }

                let newBalance = Number(account.balance);
                if (entryDto.type === EntryType.DEBIT) {
                    newBalance += Number(entryDto.amount);
                } else {
                    newBalance -= Number(entryDto.amount);
                }

                if (newBalance < 0) {
                    throw new BadRequestException({
                        message: 'Insufficient funds',
                        accountId: account.id,
                        currentBalance: account.balance,
                        attemptedAmount: entryDto.amount,
                        type: entryDto.type
                    });
                }

                account.balance = newBalance;
                await manager.save(Account, account);

                const entry = new Entry();
                entry.amount = entryDto.amount;
                entry.type = entryDto.type;
                entry.account = account;
                transaction.entries.push(entry);
            }

            const savedTransaction = await manager.save(Transaction, transaction);

            if (idempotencyKey) {
                await manager.update(IdempotencyKey, { key: idempotencyKey }, { response: JSON.parse(JSON.stringify(savedTransaction)) });
            }

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
