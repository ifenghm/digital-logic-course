import 'dotenv/config';
import { prisma } from '../src/lib/server/db';
import { UNITS } from '../src/lib/content/units';

async function main() {
	for (const unit of UNITS) {
		await prisma.unit.upsert({
			where: { id: unit.id },
			update: { order: unit.order, title: unit.title },
			create: { id: unit.id, order: unit.order, title: unit.title }
		});
	}
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
