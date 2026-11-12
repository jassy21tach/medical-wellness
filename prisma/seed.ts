import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EXAMPLE_DEV_PASSWORD = 'ChangeMeDevOnly!2026';

async function main(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.local').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? EXAMPLE_DEV_PASSWORD;
  const firstName = (process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin').trim() || 'Admin';
  const lastName = (process.env.SEED_ADMIN_LAST_NAME ?? 'MedicalWellness').trim() || 'MedicalWellness';

  if (process.env.NODE_ENV === 'production' && password === EXAMPLE_DEV_PASSWORD) {
    throw new Error(
      'Refusing to seed in production with the example password. Set a strong SEED_ADMIN_PASSWORD explicitly.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role: 'ADMIN', active: true },
    create: { email, passwordHash, firstName, lastName, role: 'ADMIN', active: true },
  });

  const receptionEmail = 'reception@example.local';
  if (receptionEmail !== email) {
    const receptionPassword = process.env.SEED_RECEPTION_PASSWORD ?? EXAMPLE_DEV_PASSWORD;
    if (process.env.NODE_ENV === 'production' && receptionPassword === EXAMPLE_DEV_PASSWORD) {
      console.warn('Skipping demo RECEPTION user in production (SEED_RECEPTION_PASSWORD not set).');
    } else {
      const receptionHash = await bcrypt.hash(receptionPassword, 12);
      await prisma.user.upsert({
        where: { email: receptionEmail },
        update: { role: 'RECEPTION', active: true },
        create: {
          email: receptionEmail,
          passwordHash: receptionHash,
          firstName: 'Reception',
          lastName: 'Demo',
          role: 'RECEPTION',
          active: true,
        },
      });
    }
  }

  const demoClients = [
    { firstName: 'Amina', lastName: 'Bennani', phone: '+212600000001', email: 'amina.demo@example.local' },
    { firstName: 'Youssef', lastName: 'Alaoui', phone: '+212600000002', email: 'youssef.demo@example.local' },
    { firstName: 'Salma', lastName: 'El Amrani', phone: '+212600000003', email: null as string | null },
  ];

  for (const c of demoClients) {
    const existing = await prisma.client.findFirst({
      where: { phone: c.phone, firstName: c.firstName, lastName: c.lastName },
    });
    if (!existing) {
      await prisma.client.create({ data: c });
    }
  }

  const demoEmployees = [
    { firstName: 'Dr', lastName: 'Sara Demo', active: true },
    { firstName: 'Nadia', lastName: 'Therapist Demo', active: true },
    { firstName: 'Karim', lastName: 'Massage Demo', active: false },
  ];

  for (const e of demoEmployees) {
    const existing = await prisma.employee.findFirst({
      where: { firstName: e.firstName, lastName: e.lastName },
    });
    if (!existing) {
      await prisma.employee.create({ data: e });
    }
  }

  console.log(`Seed completed. ADMIN=${admin.email} (id=${admin.id}).`);
  console.log('Demo clients/employees are synthetic. Do not use example passwords in production.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
