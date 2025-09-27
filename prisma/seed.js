const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/utils/auth');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user
    const adminPassword = await hashPassword('Admin123');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@dreamnest.com' },
      update: {},
      create: {
        email: 'admin@dreamnest.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Admin user created:', admin.email);

    // Create sample renter
    const renterPassword = await hashPassword('Renter123');
    const renter = await prisma.user.upsert({
      where: { email: 'renter@dreamnest.com' },
      update: {},
      create: {
        email: 'renter@dreamnest.com',
        password: renterPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: 'RENTER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Sample renter created:', renter.email);

    // Create sample property owner
    const ownerPassword = await hashPassword('Owner123');
    const owner = await prisma.user.upsert({
      where: { email: 'owner@dreamnest.com' },
      update: {},
      create: {
        email: 'owner@dreamnest.com',
        password: ownerPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891',
        role: 'OWNER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Sample property owner created:', owner.email);

    // Create sample service provider
    const providerPassword = await hashPassword('Provider123');
    const provider = await prisma.user.upsert({
      where: { email: 'provider@dreamnest.com' },
      update: {},
      create: {
        email: 'provider@dreamnest.com',
        password: providerPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        phone: '+1234567892',
        role: 'SERVICE_PROVIDER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Sample service provider created:', provider.email);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample accounts created:');
    console.log('Admin: admin@dreamnest.com / Admin123');
    console.log('Renter: renter@dreamnest.com / Renter123');
    console.log('Owner: owner@dreamnest.com / Owner123');
    console.log('Provider: provider@dreamnest.com / Provider123');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });