const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/utils/auth');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // ============================================================
    // STEP 1: CREATE USERS (Base entities - no dependencies)
    // ============================================================
    console.log('\n📝 Creating users...');

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
        phone: '+880-1711-111111',
        role: 'RENTER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Renter user created:', renter.email);

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
        phone: '+880-1722-222222',
        role: 'OWNER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Owner user created:', owner.email);

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
        phone: '+880-1733-333333',
        role: 'SERVICE_PROVIDER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Service provider user created:', provider.email);

    // Create additional users for diversity
    const secondProviderPassword = await hashPassword('Provider123');
    const secondProvider = await prisma.user.upsert({
      where: { email: 'cleaner@dreamnest.com' },
      update: {},
      create: {
        email: 'cleaner@dreamnest.com',
        password: secondProviderPassword,
        firstName: 'Fatima',
        lastName: 'Rahman',
        phone: '+880-1744-444444',
        role: 'SERVICE_PROVIDER',
        isVerified: true,
        isActive: true
      }
    });
    console.log('✅ Second service provider created:', secondProvider.email);

    // ============================================================
    // STEP 2: CREATE PROPERTIES (Depends on: owner user)
    // ============================================================
    console.log('\n🏠 Creating properties...');

    const property1 = await prisma.property.upsert({
      where: { id: 'prop-dhanmondi-001' },
      update: {},
      create: {
        id: 'prop-dhanmondi-001',
        title: 'Modern 2BR Apartment in Dhanmondi',
        description: 'Beautifully furnished 2-bedroom apartment with modern amenities, perfect for families or professionals.',
        address: '123 Satmasjid Road',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1205',
        country: 'Bangladesh',
        propertyType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 2,
        area: 1200,
        maxOccupants: 4,
        monthlyRent: 35000,
        securityDeposit: 70000,
        isActive: true,
        availableFrom: new Date('2025-11-01'),
        amenities: ['WiFi', 'AC', 'Kitchen', 'Balcony', 'Parking'],
        images: [],
        rules: ['No smoking', 'No pets', 'Quiet hours after 10 PM'],
        leaseStatus: 'VACANT',
        ownerId: owner.id
      }
    });
    console.log('✅ Property 1 created:', property1.title);

    const property2 = await prisma.property.upsert({
      where: { id: 'prop-gulshan-001' },
      update: {},
      create: {
        id: 'prop-gulshan-001',
        title: 'Luxury 3BR Apartment in Gulshan',
        description: 'Premium apartment with high-end finishes, located in prime Gulshan area.',
        address: '456 Gulshan Avenue',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1212',
        country: 'Bangladesh',
        propertyType: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 2.5,
        area: 1800,
        maxOccupants: 6,
        monthlyRent: 65000,
        securityDeposit: 130000,
        isActive: true,
        availableFrom: new Date('2025-10-20'),
        amenities: ['WiFi', 'AC', 'Luxury Kitchen', 'Balcony', 'Parking', 'Gym', 'Pool'],
        images: [],
        rules: ['No smoking', 'Pets allowed (max 2)', 'Quiet hours after 11 PM'],
        leaseStatus: 'VACANT',
        ownerId: owner.id
      }
    });
    console.log('✅ Property 2 created:', property2.title);

    const property3 = await prisma.property.upsert({
      where: { id: 'prop-mohakhali-001' },
      update: {},
      create: {
        id: 'prop-mohakhali-001',
        title: 'Studio Near University',
        description: 'Compact studio perfect for students, close to universities and public transport.',
        address: '789 Kakrail Road',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1213',
        country: 'Bangladesh',
        propertyType: 'STUDIO',
        bedrooms: 1,
        bathrooms: 1,
        area: 450,
        maxOccupants: 2,
        monthlyRent: 18000,
        securityDeposit: 36000,
        isActive: true,
        availableFrom: new Date('2025-11-15'),
        amenities: ['WiFi', 'AC', 'Kitchenette'],
        images: [],
        rules: ['No smoking', 'No pets', 'Quiet hours'],
        leaseStatus: 'VACANT',
        ownerId: owner.id
      }
    });
    console.log('✅ Property 3 created:', property3.title);

    // ============================================================
    // STEP 3: CREATE SERVICES (Depends on: provider user)
    // ============================================================
    console.log('\n🔧 Creating services...');

    const service1 = await prisma.service.upsert({
      where: { id: 'svc-maintenance-001' },
      update: {},
      create: {
        id: 'svc-maintenance-001',
        title: 'Plumbing & Maintenance',
        description: 'Professional plumbing and general maintenance services for residential properties.',
        category: 'MAINTENANCE',
        price: 2500,
        duration: 120, // 2 hours
        location: 'Dhaka',
        serviceArea: ['Dhanmondi', 'Gulshan', 'Banani'],
        isActive: true,
        images: ['https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=400&fit=crop'],
        requirements: ['Access to property', 'Description of issue'],
        providerId: provider.id
      }
    });
    console.log('✅ Service 1 created:', service1.title);

    const service2 = await prisma.service.upsert({
      where: { id: 'svc-cleaning-001' },
      update: {},
      create: {
        id: 'svc-cleaning-001',
        title: 'Professional Cleaning Service',
        description: 'Comprehensive cleaning service including deep cleaning, regular maintenance, and specialized cleaning.',
        category: 'CLEANING',
        price: 3000,
        duration: 180, // 3 hours
        location: 'Dhaka',
        serviceArea: ['Dhanmondi', 'Gulshan', 'Mohakhali'],
        isActive: true,
        images: ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop'],
        requirements: ['Property access', 'List of areas to clean'],
        providerId: secondProvider.id
      }
    });
    console.log('✅ Service 2 created:', service2.title);

    const service3 = await prisma.service.upsert({
      where: { id: 'svc-security-001' },
      update: {},
      create: {
        id: 'svc-security-001',
        title: 'Security System Installation',
        description: 'Installation and maintenance of modern security systems including CCTV and alarms.',
        category: 'SECURITY',
        price: 8000,
        duration: 240, // 4 hours
        location: 'Dhaka',
        serviceArea: ['Dhaka'],
        isActive: true,
        images: ['https://images.unsplash.com/photo-1557804506-669714d2e753?w=800&h=400&fit=crop'],
        requirements: ['Property inspection', 'Security assessment'],
        providerId: provider.id
      }
    });
    console.log('✅ Service 3 created:', service3.title);

    // ============================================================
    // STEP 4: CREATE SERVICE BOOKINGS (Depends on: renter & service)
    // ============================================================
    console.log('\n📅 Creating service bookings...');

    const booking1 = await prisma.serviceBooking.create({
      data: {
        scheduledDate: new Date('2025-10-22'),
        scheduledTime: '10:00 AM',
        duration: service1.duration,
        totalAmount: service1.price,
        status: 'COMPLETED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'CARD',
        bookerId: renter.id,
        serviceId: service1.id
      }
    });
    console.log('✅ Booking 1 created:', booking1.id);

    const booking2 = await prisma.serviceBooking.create({
      data: {
        scheduledDate: new Date('2025-10-25'),
        scheduledTime: '2:00 PM',
        duration: service2.duration,
        totalAmount: service2.price,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'CARD',
        bookerId: renter.id,
        serviceId: service2.id,
        specialRequests: 'Please focus on kitchen and bathrooms'
      }
    });
    console.log('✅ Booking 2 created:', booking2.id);

    const booking3 = await prisma.serviceBooking.create({
      data: {
        scheduledDate: new Date('2025-11-05'),
        scheduledTime: '9:00 AM',
        duration: service3.duration,
        totalAmount: service3.price,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        bookerId: renter.id,
        serviceId: service3.id
      }
    });
    console.log('✅ Booking 3 created:', booking3.id);

    // ============================================================
    // STEP 5: CREATE REVIEWS (Depends on: renter & service)
    // ============================================================
    console.log('\n⭐ Creating reviews...');

    const review1 = await prisma.review.create({
      data: {
        rating: 5,
        comment: 'Excellent service! Very professional and on time.',
        reviewType: 'SERVICE',
        authorId: renter.id,
        targetUserId: provider.id,
        serviceId: service1.id
      }
    });
    console.log('✅ Review 1 created');

    const review2 = await prisma.review.create({
      data: {
        rating: 4,
        comment: 'Good cleaning service. Would recommend!',
        reviewType: 'SERVICE',
        authorId: renter.id,
        targetUserId: secondProvider.id,
        serviceId: service2.id
      }
    });
    console.log('✅ Review 2 created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test accounts created:');
    console.log('Admin: admin@dreamnest.com / Admin123');
    console.log('Renter: renter@dreamnest.com / Renter123');
    console.log('Owner: owner@dreamnest.com / Owner123');
    console.log('Provider 1: provider@dreamnest.com / Provider123');
    console.log('Provider 2: cleaner@dreamnest.com / Provider123');
    console.log('\n🏠 Properties created: 3');
    console.log('🔧 Services created: 3');
    console.log('📅 Service bookings created: 3');
    console.log('⭐ Reviews created: 2');

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