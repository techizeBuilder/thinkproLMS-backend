import mongoose from "mongoose";
import dotenv from "dotenv";
import Subject from "../models/Subject";
import Module from "../models/Module";
import { dbName } from "../constants";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    // Create sample subjects
    const subjects = [
      { name: "Mathematics" },
      { name: "Science" },
      { name: "English" },
      { name: "Social Studies" },
      { name: "Computer Science" },
    ];

    const createdSubjects = [];
    for (const subjectData of subjects) {
      const existingSubject = await Subject.findOne({ name: subjectData.name });
      if (!existingSubject) {
        const subject = await Subject.create(subjectData);
        createdSubjects.push(subject);
        console.log(`✅ Created subject: ${subject.name}`);
      } else {
        createdSubjects.push(existingSubject);
        console.log(`⚠️ Subject already exists: ${existingSubject.name}`);
      }
    }

    // Create sample modules for Grade 5 Mathematics
    const mathSubject = createdSubjects.find(s => s.name === "Mathematics");
    if (mathSubject) {
      const existingModule = await Module.findOne({ 
        grade: 5, 
        subject: mathSubject._id 
      });
      
      if (!existingModule) {
        const mathModule = await Module.create({
          grade: 5,
          subject: mathSubject._id,
          modules: [
            {
              name: "Numbers and Operations",
              description: "Basic number operations and calculations",
              topics: [
                {
                  name: "Addition and Subtraction",
                  subtopics: [
                    { name: "Two-digit addition" },
                    { name: "Two-digit subtraction" },
                    { name: "Word problems" }
                  ]
                },
                {
                  name: "Multiplication and Division",
                  subtopics: [
                    { name: "Times tables" },
                    { name: "Long multiplication" },
                    { name: "Division with remainders" }
                  ]
                }
              ]
            },
            {
              name: "Fractions and Decimals",
              description: "Understanding fractions and decimal numbers",
              topics: [
                {
                  name: "Basic Fractions",
                  subtopics: [
                    { name: "Understanding fractions" },
                    { name: "Equivalent fractions" },
                    { name: "Comparing fractions" }
                  ]
                }
              ]
            }
          ]
        });
        console.log(`✅ Created Mathematics module for Grade 5`);
      } else {
        console.log(`⚠️ Mathematics module for Grade 5 already exists`);
      }
    }

    // Create sample modules for Grade 5 Science
    const scienceSubject = createdSubjects.find(s => s.name === "Science");
    if (scienceSubject) {
      const existingModule = await Module.findOne({ 
        grade: 5, 
        subject: scienceSubject._id 
      });
      
      if (!existingModule) {
        const scienceModule = await Module.create({
          grade: 5,
          subject: scienceSubject._id,
          modules: [
            {
              name: "Living Things",
              description: "Understanding living organisms and their characteristics",
              topics: [
                {
                  name: "Plants and Animals",
                  subtopics: [
                    { name: "Plant life cycle" },
                    { name: "Animal habitats" },
                    { name: "Food chains" }
                  ]
                }
              ]
            },
            {
              name: "Matter and Materials",
              description: "Properties of different materials and states of matter",
              topics: [
                {
                  name: "States of Matter",
                  subtopics: [
                    { name: "Solid, liquid, gas" },
                    { name: "Changes of state" }
                  ]
                }
              ]
            }
          ]
        });
        console.log(`✅ Created Science module for Grade 5`);
      } else {
        console.log(`⚠️ Science module for Grade 5 already exists`);
      }
    }

    console.log("✅ Seeding completed successfully");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error seeding subjects and modules:", err.message);
    process.exit(1);
  }
};

run();
