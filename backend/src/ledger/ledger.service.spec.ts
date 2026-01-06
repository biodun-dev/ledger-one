import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { CreateTransactionDto } from './dto/ledger.dto';
import { EntryType } from './entities/transaction.entity';
import { LedgerService } from './ledger.service';

const mockAccount = { id: 'acc_1', name: 'Cash', balance: 1000 };
const mockTransaction = { id: 'tx_1', description: 'Test', entries: [] };

describe('LedgerService', () => {
    let service: LedgerService;
    let dataSource: DataSource;
    let queryRunner: QueryRunner;
    let manager: EntityManager;

    beforeEach(async () => {
        manager = {
            findOne: jest.fn(),
            insert: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as any;

        queryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: manager,
        } as any;

        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
            getRepository: jest.fn().mockReturnValue({
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockImplementation((ac) => Promise.resolve({ ...ac, id: 'new_id' }))
            }),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LedgerService,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<LedgerService>(LedgerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTransaction', () => {
        const dto: CreateTransactionDto = {
            description: 'Test Tx',
            reference: 'ref_1',
            entries: [
                { accountId: 'acc_1', amount: 100, type: EntryType.DEBIT },
                { accountId: 'acc_2', amount: 100, type: EntryType.CREDIT },
            ],
        };

        it('should successfully create a transaction', async () => {
            (manager.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // Idempotency check
                .mockResolvedValueOnce({ ...mockAccount, id: 'acc_1', balance: 1000 }) // Account 1
                .mockResolvedValueOnce({ ...mockAccount, id: 'acc_2', balance: 500 }); // Account 2

            (manager.save as jest.Mock)
                .mockResolvedValueOnce({ ...mockAccount }) // Save Account 1
                .mockResolvedValueOnce({ ...mockAccount }) // Save Account 2
                .mockResolvedValueOnce({ ...mockTransaction, id: 'tx_new' }); // Save Transaction

            const result = await service.createTransaction(dto, 'test-key');

            expect(queryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
            expect(manager.save).toHaveBeenCalledTimes(3); // 2 Accounts + 1 Transaction
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should fail if debits do not equal credits', async () => {
            const unbalancedDto = {
                ...dto,
                entries: [
                    { accountId: 'acc_1', amount: 100, type: EntryType.DEBIT },
                    { accountId: 'acc_2', amount: 50, type: EntryType.CREDIT },
                ]
            };

            await expect(service.createTransaction(unbalancedDto, 'test-key')).rejects.toThrow(BadRequestException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should return cached response for idempotent request', async () => {
            (manager.findOne as jest.Mock).mockResolvedValueOnce({
                key: 'test-key',
                response: mockTransaction
            });

            const result = await service.createTransaction(dto, 'test-key');

            expect(result).toEqual(mockTransaction);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            // We rollback because we didn't do any writes in THIS session, 
            // but effectively we "succeeded" by returning the cache.
        });

        it('should fail with ConflictException if idempotency key exists but no response (in-progress)', async () => {
            (manager.findOne as jest.Mock).mockResolvedValueOnce({
                key: 'test-key',
                response: null
            });

            await expect(service.createTransaction(dto, 'test-key')).rejects.toThrow(ConflictException);
        });

        it('should fail if account does not exist', async () => {
            (manager.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // Idempotency
                .mockResolvedValueOnce(null); // Account 1 not found

            await expect(service.createTransaction(dto, 'test-key')).rejects.toThrow(); // NotFoundException
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });
});
