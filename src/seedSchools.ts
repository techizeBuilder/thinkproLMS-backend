import mongoose from "mongoose";
import dotenv from "dotenv";
import School from "./models/School";
import { dbName } from "./constants";

dotenv.config();

const sampleSchools = [
  {
    name: "Delhi Public School",
    address: "123 Main Street, Sector 1",
    board: "CBSE",
    state: "Delhi",
    city: "New Delhi",
    branchName: "Sector 1 Branch",
    affiliatedTo: "Central Board of Secondary Education",
  },
  {
    name: "St. Xavier's High School",
    address: "456 Church Road, Fort",
    board: "ICSE",
    state: "Maharashtra",
    city: "Mumbai",
    affiliatedTo: "Council for the Indian School Certificate Examinations",
  },
  {
    name: "Kendriya Vidyalaya",
    address: "789 Government Colony",
    board: "CBSE",
    state: "Karnataka",
    city: "Bangalore",
    branchName: "Whitefield Branch",
    affiliatedTo: "Kendriya Vidyalaya Sangathan",
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!, { dbName });
    console.log("MongoDB connected for seeding schools");

    // Clear existing schools (optional)
    await School.deleteMany({});
    console.log("Cleared existing schools");

    // Insert sample schools
    const createdSchools = await School.insertMany(sampleSchools);
    console.log(`✅ Created ${createdSchools.length} sample schools`);

    console.log("Schools created:");
    createdSchools.forEach((school) => {
      console.log(`- ${school.name} (${school.city}, ${school.state})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding schools:", error);
    process.exit(1);
  }
};

run();
