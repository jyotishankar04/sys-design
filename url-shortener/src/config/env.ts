
import z from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().default(""),
}).transform(
  (env) => ({
    ...env,
    PORT: parseInt(env.PORT),
  }),
);

export const env = envSchema.parse(process.env);
