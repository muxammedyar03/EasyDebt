import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Configuration
const START_DATE = new Date("2025-06-01");
const END_DATE = new Date();
const DEBTOR_COUNT = 105; // 100+

// Non-Uzbek names for demo
const FIRST_NAMES = [
    "John",
    "Alice",
    "Robert",
    "Emma",
    "Michael",
    "Sarah",
    "David",
    "Emily",
    "James",
    "Olivia",
    "William",
    "Sophia",
    "Richard",
    "Isabella",
    "Thomas",
    "Mia",
    "Charles",
    "Charlotte",
    "Daniel",
    "Amelia",
    "Matthew",
    "Harper",
    "Anthony",
    "Evelyn",
    "Donald",
    "Abigail",
    "Mark",
    "Ella",
    "Paul",
    "Elizabeth",
    "Steven",
    "Sofia",
    "Andrew",
    "Avery",
    "Kenneth",
    "Scarlett",
    "Joshua",
    "Grace",
    "Kevin",
    "Chloe",
    "Brian",
    "Victoria",
    "George",
    "Riley",
    "Edward",
    "Aria",
    "Ronald",
    "Lily",
    "Timothy",
    "Aubrey",
    "Jason",
    "Zoey",
    "Jeffrey",
    "Penelope",
    "Ryan",
    "Lillian",
    "Jacob",
    "Addison",
    "Gary",
    "Layla",
    "Nicholas",
    "Natalie",
    "Eric",
    "Camila",
    "Jonathan",
    "Hannah",
    "Stephen",
    "Brooklyn",
    "Larry",
    "Zoe",
    "Justin",
    "Nora",
    "Scott",
    "Leah",
    "Brandon",
    "Savannah",
    "Benjamin",
    "Audrey",
    "Samuel",
    "Claire",
    "Gregory",
    "Eleanor",
    "Frank",
    "Skylar",
    "Alexander",
    "Ellie",
    "Patrick",
    "Samantha",
    "Raymond",
    "Stella",
    "Jack",
    "Paisley",
    "Dennis",
    "Violet",
    "Jerry",
    "Mila",
    "Tyler",
    "Allison",
    "Aaron",
    "Alexa",
];

const LAST_NAMES = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Torres",
    "Nguyen",
    "Hill",
    "Flores",
    "Green",
    "Adams",
    "Nelson",
    "Baker",
    "Hall",
    "Rivera",
    "Campbell",
    "Mitchell",
    "Carter",
    "Roberts",
    "Gomez",
    "Phillips",
    "Evans",
    "Turner",
    "Diaz",
    "Parker",
    "Cruz",
    "Edwards",
    "Collins",
    "Reyes",
    "Stewart",
    "Morris",
    "Morales",
    "Murphy",
    "Cook",
    "Rogers",
    "Gutierrez",
    "Ortiz",
    "Morgan",
    "Cooper",
    "Peterson",
    "Bailey",
    "Reed",
    "Kelly",
    "Howard",
    "Ramos",
    "Kim",
    "Cox",
    "Ward",
    "Richardson",
    "Watson",
    "Brooks",
    "Chavez",
    "Wood",
    "James",
    "Bennett",
    "Gray",
    "Mendoza",
    "Ruiz",
    "Hughes",
    "Price",
    "Alvarez",
    "Castillo",
    "Sanders",
    "Patel",
    "Myers",
    "Long",
    "Ross",
    "Foster",
    "Jimenez",
];

const DESCRIPTIONS = [
    "Consulting services",
    "Web development",
    "Marketing campaign",
    "SEO optimization",
    "Logo design",
    "Mobile app development",
    "Hosting fees",
    "Domain registration",
    "Software license",
    "Hardware purchase",
    "Office supplies",
    "Maintenance service",
    "Support contract",
    "Training session",
    "Data analysis",
    "Cloud infrastructure",
    "Security audit",
    "Content creation",
    "Social media management",
    "Email marketing",
];

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

async function main() {
    console.log("🌱 Starting demo data generation...");

    // 1. Create or ensure Guest User exists
    const guestPassword = await bcrypt.hash("guest123", 10);
    const guestUser = await prisma.user.upsert({
        where: { username: "guest" },
        update: { password: guestPassword, is_active: true },
        create: {
            username: "guest",
            email: "guest@example.com",
            password: guestPassword,
            role: UserRole.USER,
            first_name: "Demo",
            last_name: "Guest",
            is_active: true,
        },
    });

    console.log(`✅ User '${guestUser.username}' ready.`);

    // 2. Generate Debtors
    console.log(`Generating ${DEBTOR_COUNT} debtors...`);

    for (let i = 0; i < DEBTOR_COUNT; i++) {
        const firstName = getRandomElement(FIRST_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const phone = `+1${getRandomInt(200, 999)}${getRandomInt(1000000, 9999999)}`;

        // Determine debtor type:
        // 0: Good payer - will end up with 0 debt most likely (~45% chance to hit ~47 users)
        // 1: Occasional late payer (~30% chance)
        // 2: Chronic late payer (~25% chance)
        const rand = Math.random();
        const debtorType = rand < 0.45 ? 0 : rand < 0.75 ? 1 : 2;

        const debtor = await prisma.debtor.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                phone_number: phone,
                address: `${getRandomInt(1, 999)} ${getRandomElement(["Main St", "Broadway", "5th Ave", "Park Ln", "Oak St"])}`,
                created_by: guestUser.id,
                created_at: getRandomDate(START_DATE, addDays(START_DATE, 30)), // Created sometime in the first month
            },
        });

        // 3. Generate History for each debtor from their creation date to now
        let currentDate = new Date(debtor.created_at);
        let totalDebt = 0;
        let lastPaymentDate: Date | null = null;

        // Monthly loop simulation
        while (currentDate < END_DATE) {
            // Add a debt
            // Chance to add debt: 70%
            if (Math.random() > 0.3) {
                const amount = getRandomInt(100000, 2000000); // 100k - 2M
                await prisma.debt.create({
                    data: {
                        debtor_id: debtor.id,
                        amount: amount,
                        description: getRandomElement(DESCRIPTIONS),
                        created_by: guestUser.id,
                        created_at: currentDate,
                    },
                });
                totalDebt += amount;
            }

            // Decide if payment happens this month
            // Good payer: 95% chance
            // Occasional: 60% chance
            // Bad: 30% chance
            const payChance = debtorType === 0 ? 0.95 : debtorType === 1 ? 0.6 : 0.3;

            if (Math.random() < payChance && totalDebt > 0) {
                // Payment delay?
                const daysDelay =
                    debtorType === 0 ? getRandomInt(1, 5) : debtorType === 1 ? getRandomInt(5, 20) : getRandomInt(15, 60);
                const paymentDate = addDays(currentDate, daysDelay);

                if (paymentDate <= END_DATE) {
                    // Payment amount:
                    // Good: Pays everything (100%)
                    // Occasional: 50-100%
                    // Bad: 10-50%
                    const payRatio =
                        debtorType === 0 ? 1 : debtorType === 1 ? getRandomInt(50, 100) / 100 : getRandomInt(10, 50) / 100;
                    let payAmount = Math.floor(totalDebt * payRatio);

                    if (payAmount === 0 && totalDebt > 0) payAmount = Math.min(totalDebt, 50000);

                    await prisma.payment.create({
                        data: {
                            debtor_id: debtor.id,
                            amount: payAmount,
                            created_by: guestUser.id,
                            created_at: paymentDate,
                            payment_type: "CASH",
                        },
                    });
                    totalDebt -= payAmount;
                    lastPaymentDate = paymentDate;
                }
            }

            // Advance time by 15-45 days
            currentDate = addDays(currentDate, getRandomInt(15, 45));
        }

        // Force clear debt for Good Payers if they have lingering small debt or just to ensure 0 balance count
        if (debtorType === 0 && totalDebt > 0) {
            const finalPayDate = addDays(new Date(), -1); // Paid yesterday
            await prisma.payment.create({
                data: {
                    debtor_id: debtor.id,
                    amount: totalDebt, // Pay remaining
                    created_by: guestUser.id,
                    created_at: finalPayDate,
                    payment_type: "CASH",
                    note: "Final settlement"
                },
            });
            totalDebt = 0;
            lastPaymentDate = finalPayDate;
        }

        // Update debtor final state
        await prisma.debtor.update({
            where: { id: debtor.id },
            data: {
                total_debt: totalDebt,
                last_payment_date: lastPaymentDate,
                is_overdue:
                    totalDebt > 0 &&
                    (!lastPaymentDate || END_DATE.getTime() - lastPaymentDate.getTime() > 30 * 24 * 60 * 60 * 1000),
            },
        });

        if (i % 10 === 0) process.stdout.write(".");
    }

    console.log("\n✅ Demo data generation complete!");
}

main()
    .catch((e) => {
        console.error("Error generating data:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
