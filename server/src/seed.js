import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { User } from "./models/User.js";
import { Listing } from "./models/Listing.js";
import { Alert } from "./models/Alert.js";

async function seed() {
  await mongoose.connect(config.mongoUri);
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Alert.deleteMany({})]);

  const passwordHash = await bcrypt.hash("password123", 10);
  const [maya, leo, priya] = await User.create([
    { name: "Maya Chen", email: "maya@campus.edu", passwordHash, campus: "North Quad" },
    { name: "Leo Okonkwo", email: "leo@campus.edu", passwordHash, campus: "West Hall" },
    { name: "Priya Shah", email: "priya@campus.edu", passwordHash, campus: "Science Block" },
  ]);

  const now = Date.now();
  await Listing.create([
    {
      sellerId: maya._id,
      title: "Organic chemistry textbook (8th ed)",
      description: "Highlighted but intact. Pickup at library steps after 5pm.",
      category: "textbooks",
      condition: "good",
      imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "Main library steps",
      startingPriceCents: 1500,
      reserveCents: 2500,
      incrementCents: 100,
      startsAt: new Date(now - 60_000),
      endsAt: new Date(now + 15 * 60_000),
      originalEndsAt: new Date(now + 15 * 60_000),
      status: "live",
    },
    {
      sellerId: leo._id,
      title: "Used mountain bike, 21-speed",
      description: "New brake pads last month. Lock not included.",
      category: "bikes",
      condition: "good",
      imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "West Hall bike racks",
      startingPriceCents: 8000,
      reserveCents: 0,
      incrementCents: 500,
      startsAt: new Date(now - 30_000),
      endsAt: new Date(now + 45 * 60_000),
      originalEndsAt: new Date(now + 45 * 60_000),
      status: "live",
    },
    {
      sellerId: priya._id,
      title: "Mini fridge (works, needs clean)",
      description: "Dorm size. Must pick up Saturday morning.",
      category: "furniture",
      condition: "fair",
      imageUrl: "https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "Science Block loading dock",
      startingPriceCents: 4000,
      reserveCents: 4000,
      incrementCents: 200,
      startsAt: new Date(now + 5 * 60_000),
      endsAt: new Date(now + 3 * 60 * 60_000),
      originalEndsAt: new Date(now + 3 * 60 * 60_000),
      status: "scheduled",
    },
    {
      sellerId: maya._id,
      title: "Gaming laptop with RTX 3060",
      description: "Battery holds charge for 2 hours. Includes charger and bag.",
      category: "electronics",
      condition: "like_new",
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "Engineering lobby",
      startingPriceCents: 28000,
      reserveCents: 32000,
      incrementCents: 800,
      startsAt: new Date(now - 10 * 60_000),
      endsAt: new Date(now + 2 * 60 * 60_000),
      originalEndsAt: new Date(now + 2 * 60 * 60_000),
      status: "live",
    },
    {
      sellerId: priya._id,
      title: "Vintage speakers set",
      description: "Warm sound, great for dorm rooms and study sessions.",
      category: "electronics",
      condition: "good",
      imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "Media center room 3",
      startingPriceCents: 5400,
      reserveCents: 7000,
      incrementCents: 300,
      startsAt: new Date(now + 2 * 60_000),
      endsAt: new Date(now + 5 * 60 * 60_000),
      originalEndsAt: new Date(now + 5 * 60 * 60_000),
      status: "scheduled",
    },
    {
      sellerId: leo._id,
      title: "Desk chair and study lamp bundle",
      description: "Comfortable ergonomic chair, adjustable lamp, all in good condition.",
      category: "furniture",
      condition: "good",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&auto=format&fit=crop&q=80",
      pickupLocation: "Dorm block B",
      startingPriceCents: 3000,
      reserveCents: 4500,
      incrementCents: 200,
      startsAt: new Date(now - 2 * 60_000),
      endsAt: new Date(now + 25 * 60_000),
      originalEndsAt: new Date(now + 25 * 60_000),
      status: "live",
    },
  ]);

  await Alert.create({
    userId: leo._id,
    keywords: "chemistry textbook",
    category: "textbooks",
    maxPriceCents: 5000,
  });

  console.log("Seeded users: maya@campus.edu / leo@campus.edu / priya@campus.edu  password123");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
