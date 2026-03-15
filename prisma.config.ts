import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // Crucial to load .env variables in the config file itself

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL,
  }
});