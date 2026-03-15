const { prisma } = require('./lib/prisma');

async function test() {
  try {
    console.log("Checking prisma...");
    // Just accessing it should trigger initialization
    console.log("Prisma instance created.");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

test();
