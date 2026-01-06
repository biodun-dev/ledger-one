import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
    POSTGRES_HOST: Joi.string().default('localhost'),
    POSTGRES_PORT: Joi.number().default(5432),
    POSTGRES_USER: Joi.string().required(),
    POSTGRES_PASSWORD: Joi.string().required(),
    POSTGRES_DB: Joi.string().required(),
    PORT: Joi.number().default(3001),
    RATE_LIMIT_TTL: Joi.number().default(60000),
    RATE_LIMIT_LIMIT: Joi.number().default(100),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
});
