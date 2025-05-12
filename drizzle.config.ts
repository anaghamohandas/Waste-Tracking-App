export default {
  dialect: "postgresql",
  schema: "./utils/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_lS9n2tRapuDP@ep-twilight-firefly-a572cvg2-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    connectionString:
      "postgresql://neondb_owner:npg_lS9n2tRapuDP@ep-twilight-firefly-a572cvg2-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
};
