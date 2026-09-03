import { db, partsTable } from "@workspace/db";
import { logger } from "./logger";

const starterParts = [
  {
    name: "BLDC Motor 1000W",
    category: "Motors",
    price: 8500,
    description: "A practical motor option for compatible EV builds.",
    icon: "motor",
  },
  {
    name: "EV Controller 48V",
    category: "Controllers",
    price: 2250,
    description: "Smooth power control for compatible 48V systems.",
    icon: "controller",
  },
  {
    name: "Throttle & Display Kit",
    category: "Displays",
    price: 1150,
    description: "A simple replacement kit to keep the ride readable.",
    icon: "display",
  },
  {
    name: "DC-DC Converter",
    category: "Electrical",
    price: 950,
    description: "Useful electrical support for compatible EV setups.",
    icon: "charger",
  },
  {
    name: "Brake Cut-off Sensor",
    category: "Brakes",
    price: 350,
    description: "A small but important part for safer everyday rides.",
    icon: "brake",
  },
  {
    name: "Charging Port Assembly",
    category: "Charging",
    price: 650,
    description: "Replacement charging hardware for selected vehicles.",
    icon: "battery",
  },
];

export async function seedParts(): Promise<void> {
  const existing = await db.select({ id: partsTable.id }).from(partsTable).limit(1);
  if (existing.length > 0) return;

  await db.insert(partsTable).values(starterParts);
  logger.info({ count: starterParts.length }, "Seeded starter EV parts");
}