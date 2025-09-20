import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User";
import School from "../models/School";
import Student from "../models/Student";
import Mentor from "../models/Mentor";
import LeadMentor from "../models/LeadMentor";
import SchoolAdmin from "../models/SchoolAdmin";
import { Question, QuestionRecommendation } from "../models/QuestionBank";
import { dbName, ROLES, PERMISSIONS } from "../constants";

dotenv.config();

const run = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    // Clear all collections
    console.log("🗑️ Clearing all collections...");
    await User.deleteMany({});
    await School.deleteMany({});
    await Student.deleteMany({});
    await Mentor.deleteMany({});
    await LeadMentor.deleteMany({});
    await SchoolAdmin.deleteMany({});
    await Question.deleteMany({});
    await QuestionRecommendation.deleteMany({});
    console.log("✅ All collections cleared");

    // Create SuperAdmin
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@thinkpro.com";
    const superAdminPassword = process.env.SUPERADMIN_PASS || "admin123";

    const superAdmin = await User.create({
      name: "System SuperAdmin",
      email: superAdminEmail,
      password: superAdminPassword,
      role: ROLES.SuperAdmin,
      isVerified: true,
      isSystemAdmin: true,
    });
    console.log("✅ SuperAdmin created:", superAdmin.email);

    // Create sample schools
    const schools = await School.create([
      {
        name: "Delhi Public School",
        address: "123 Education Street, New Delhi",
        board: "CBSE",
        state: "Delhi",
        city: "New Delhi",
        affiliatedTo: "CBSE Board",
        contractStartDate: new Date("2024-01-01"),
        contractEndDate: new Date("2024-12-31"),
        projectStartDate: new Date("2024-01-15"),
        projectEndDate: new Date("2024-11-30"),
        schoolHeads: [
          {
            name: "Dr. Rajesh Kumar",
            designation: "Principal",
            email: "principal@dpsdelhi.com",
            phoneNumber: "+91-9876543210",
          },
          {
            name: "Ms. Priya Sharma",
            designation: "Vice Principal",
            email: "viceprincipal@dpsdelhi.com",
            phoneNumber: "+91-9876543211",
          },
        ],
        serviceDetails: {
          serviceType: "Full Service",
          mentors: ["School Mentor", "Thinker Mentor"],
          subjects: ["Robotics"],
          grades: [
            { grade: 6, sections: ["A", "B", "C"] },
            { grade: 7, sections: ["A", "B", "C"] },
            { grade: 8, sections: ["A", "B"] },
          ],
        },
        isActive: true,
      },
      {
        name: "St. Mary's Convent School",
        address: "456 Church Road, Mumbai",
        board: "ICSE",
        state: "Maharashtra",
        city: "Mumbai",
        affiliatedTo: "ICSE Board",
        contractStartDate: new Date("2024-02-01"),
        contractEndDate: new Date("2024-12-31"),
        projectStartDate: new Date("2024-02-15"),
        projectEndDate: new Date("2024-11-30"),
        schoolHeads: [
          {
            name: "Sister Mary Joseph",
            designation: "Principal",
            email: "principal@stmarys.com",
            phoneNumber: "+91-9876543212",
          },
        ],
        serviceDetails: {
          serviceType: "Partial Service",
          mentors: ["School Mentor"],
          subjects: ["Robotics", ],
          grades: [
            { grade: 9, sections: ["A", "B"] },
            { grade: 10, sections: ["A", "B"] },
          ],
        },
        isActive: true,
      },
      {
        name: "Kendriya Vidyalaya No. 1",
        address: "789 Government Colony, Bangalore",
        board: "CBSE",
        state: "Karnataka",
        city: "Bangalore",
        affiliatedTo: "KVS",
        contractStartDate: new Date("2024-03-01"),
        contractEndDate: new Date("2024-12-31"),
        projectStartDate: new Date("2024-03-15"),
        projectEndDate: new Date("2024-11-30"),
        schoolHeads: [
          {
            name: "Mr. Suresh Reddy",
            designation: "Principal",
            email: "principal@kv1bangalore.com",
            phoneNumber: "+91-9876543213",
          },
        ],
        serviceDetails: {
          serviceType: "Full Service",
          mentors: ["School Mentor", "Thinker Mentor"],
          subjects: ["Robotics"],
          grades: [
            { grade: 5, sections: ["A", "B", "C", "D"] },
            { grade: 6, sections: ["A", "B", "C"] },
            { grade: 7, sections: ["A", "B"] },
          ],
        },
        isActive: true,
      },
    ]);
    console.log("✅ Schools created:", schools.length);

    // Create Lead Mentors
    const leadMentors = await User.create([
      {
        name: "Dr. Anjali Singh",
        email: "anjali.singh@thinkpro.com",
        password: "leadmentor123",
        role: ROLES.LeadMentor,
        isVerified: true,
      },
      {
        name: "Mr. Vikram Patel",
        email: "vikram.patel@thinkpro.com",
        password: "leadmentor123",
        role: ROLES.LeadMentor,
        isVerified: true,
      },
    ]);

    const leadMentorProfiles = await LeadMentor.create([
      {
        user: leadMentors[0]._id,
        phoneNumber: "+91-9876543220",
        assignedSchools: [schools[0]._id, schools[1]._id],
        hasAccessToAllSchools: false,
        permissions: [PERMISSIONS.ADD_STUDENTS, PERMISSIONS.ADD_MENTORS, PERMISSIONS.ADD_ADMINS],
        isActive: true,
      },
      {
        user: leadMentors[1]._id,
        phoneNumber: "+91-9876543221",
        assignedSchools: [schools[2]._id],
        hasAccessToAllSchools: false,
        permissions: [PERMISSIONS.ADD_STUDENTS, PERMISSIONS.ADD_MENTORS],
        isActive: true,
      },
    ]);
    console.log("✅ Lead Mentors created:", leadMentorProfiles.length);

    // Create School Admins
    const schoolAdmins = await User.create([
      {
        name: "Mrs. Sunita Gupta",
        email: "sunita.gupta@dpsdelhi.com",
        password: "schooladmin123",
        role: ROLES.SchoolAdmin,
        isVerified: true,
      },
      {
        name: "Mr. Ravi Nair",
        email: "ravi.nair@stmarys.com",
        password: "schooladmin123",
        role: ROLES.SchoolAdmin,
        isVerified: true,
      },
      {
        name: "Ms. Deepa Iyer",
        email: "deepa.iyer@kv1bangalore.com",
        password: "schooladmin123",
        role: ROLES.SchoolAdmin,
        isVerified: true,
      },
    ]);

    const schoolAdminProfiles = await SchoolAdmin.create([
      {
        user: schoolAdmins[0]._id,
        assignedSchools: [schools[0]._id],
        phoneNumber: "+91-9876543230",
        isActive: true,
      },
      {
        user: schoolAdmins[1]._id,
        assignedSchools: [schools[1]._id],
        phoneNumber: "+91-9876543231",
        isActive: true,
      },
      {
        user: schoolAdmins[2]._id,
        assignedSchools: [schools[2]._id],
        phoneNumber: "+91-9876543232",
        isActive: true,
      },
    ]);
    console.log("✅ School Admins created:", schoolAdminProfiles.length);

    // Create Mentors
    const mentors = await User.create([
      {
        name: "Dr. Rajesh Kumar",
        email: "rajesh.kumar@thinkpro.com",
        password: "mentor123",
        role: ROLES.Mentor,
        isVerified: true,
      },
      {
        name: "Ms. Priya Sharma",
        email: "priya.sharma@thinkpro.com",
        password: "mentor123",
        role: ROLES.Mentor,
        isVerified: true,
      },
      {
        name: "Mr. Amit Verma",
        email: "amit.verma@thinkpro.com",
        password: "mentor123",
        role: ROLES.Mentor,
        isVerified: true,
      },
      {
        name: "Dr. Neha Agarwal",
        email: "neha.agarwal@thinkpro.com",
        password: "mentor123",
        role: ROLES.Mentor,
        isVerified: true,
      },
    ]);

    const mentorProfiles = await Mentor.create([
      {
        user: mentors[0]._id,
        salutation: "Dr.",
        address: "123 Teacher's Colony, New Delhi",
        phoneNumber: "+91-9876543240",
        assignedSchools: [schools[0]._id],
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
      {
        user: mentors[1]._id,
        salutation: "Ms.",
        address: "456 Educator's Lane, Mumbai",
        phoneNumber: "+91-9876543241",
        assignedSchools: [schools[1]._id],
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
      {
        user: mentors[2]._id,
        salutation: "Mr.",
        address: "789 Learning Street, Bangalore",
        phoneNumber: "+91-9876543242",
        assignedSchools: [schools[2]._id],
        isActive: true,
        addedBy: leadMentors[1]._id,
      },
      {
        user: mentors[3]._id,
        salutation: "Dr.",
        address: "321 Knowledge Park, New Delhi",
        phoneNumber: "+91-9876543243",
        assignedSchools: [schools[0]._id, schools[2]._id],
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
    ]);
    console.log("✅ Mentors created:", mentorProfiles.length);

    // Create Students
    const students = await User.create([
      {
        name: "Arjun Singh",
        email: "arjun.singh@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
      {
        name: "Priya Patel",
        email: "priya.patel@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
      {
        name: "Rahul Kumar",
        email: "rahul.kumar@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
      {
        name: "Sneha Reddy",
        email: "sneha.reddy@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
      {
        name: "Vikram Joshi",
        email: "vikram.joshi@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
      {
        name: "Ananya Gupta",
        email: "ananya.gupta@student.com",
        password: "student123",
        role: ROLES.Student,
        isVerified: true,
      },
    ]);

    const studentProfiles = await Student.create([
      {
        user: students[0]._id,
        school: schools[0]._id,
        studentId: "DPS001",
        grade: "Grade 6",
        parentEmail: "parent1@email.com",
        parentPhoneNumber: "+91-9876543250",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
      {
        user: students[1]._id,
        school: schools[0]._id,
        studentId: "DPS002",
        grade: "Grade 7",
        parentEmail: "parent2@email.com",
        parentPhoneNumber: "+91-9876543251",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
      {
        user: students[2]._id,
        school: schools[1]._id,
        studentId: "SMC001",
        grade: "Grade 9",
        parentEmail: "parent3@email.com",
        parentPhoneNumber: "+91-9876543252",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
      {
        user: students[3]._id,
        school: schools[2]._id,
        studentId: "KV001",
        grade: "Grade 5",
        parentEmail: "parent4@email.com",
        parentPhoneNumber: "+91-9876543253",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[1]._id,
      },
      {
        user: students[4]._id,
        school: schools[2]._id,
        studentId: "KV002",
        grade: "Grade 6",
        parentEmail: "parent5@email.com",
        parentPhoneNumber: "+91-9876543254",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[1]._id,
      },
      {
        user: students[5]._id,
        school: schools[0]._id,
        studentId: "DPS003",
        grade: "Grade 8",
        parentEmail: "parent6@email.com",
        parentPhoneNumber: "+91-9876543255",
        hasCustomCredentials: true,
        isActive: true,
        addedBy: leadMentors[0]._id,
      },
    ]);
    console.log("✅ Students created:", studentProfiles.length);

    // Create Sample Questions
    const sampleQuestions = await Question.create([
      {
        questionText: "What is the capital of India?",
        grade: "Grade 6",
        subject: "Social Studies",
        module: "Geography",
        answerType: "radio",
        answerChoices: [
          { text: "Mumbai", isCorrect: false, order: 1 },
          { text: "New Delhi", isCorrect: true, order: 2 },
          { text: "Bangalore", isCorrect: false, order: 3 },
          { text: "Chennai", isCorrect: false, order: 4 },
        ],
        correctAnswers: [1],
        difficulty: "Easy",
        order: 1,
        isActive: true,
        createdBy: superAdmin._id,
        approvedBy: superAdmin._id,
        approvedAt: new Date(),
      },
      {
        questionText: "Which of the following are prime numbers?",
        grade: "Grade 7",
        subject: "Mathematics",
        module: "Number System",
        answerType: "checkbox",
        answerChoices: [
          { text: "2", isCorrect: true, order: 1 },
          { text: "4", isCorrect: false, order: 2 },
          { text: "7", isCorrect: true, order: 3 },
          { text: "9", isCorrect: false, order: 4 },
        ],
        correctAnswers: [0, 2],
        difficulty: "Medium",
        order: 1,
        isActive: true,
        createdBy: superAdmin._id,
        approvedBy: superAdmin._id,
        approvedAt: new Date(),
      },
      {
        questionText: "What is the chemical symbol for water?",
        grade: "Grade 8",
        subject: "Science",
        module: "Chemistry",
        answerType: "radio",
        answerChoices: [
          { text: "H2O", isCorrect: true, order: 1 },
          { text: "CO2", isCorrect: false, order: 2 },
          { text: "NaCl", isCorrect: false, order: 3 },
          { text: "O2", isCorrect: false, order: 4 },
        ],
        correctAnswers: [0],
        difficulty: "Easy",
        order: 1,
        isActive: true,
        createdBy: superAdmin._id,
        approvedBy: superAdmin._id,
        approvedAt: new Date(),
      },
    ]);
    console.log("✅ Sample Questions created:", sampleQuestions.length);

    // Create Sample Question Recommendations
    const questionRecommendations = await QuestionRecommendation.create([
      {
        questionText: "What is the largest planet in our solar system?",
        grade: "Grade 6",
        subject: "Science",
        module: "Astronomy",
        answerType: "radio",
        answerChoices: [
          { text: "Earth", isCorrect: false, order: 1 },
          { text: "Jupiter", isCorrect: true, order: 2 },
          { text: "Saturn", isCorrect: false, order: 3 },
          { text: "Mars", isCorrect: false, order: 4 },
        ],
        correctAnswers: [1],
        difficulty: "Medium",
        status: "pending",
        recommendedBy: mentors[0]._id,
      },
      {
        questionText: "Solve: 2x + 5 = 13",
        grade: "Grade 7",
        subject: "Mathematics",
        module: "Algebra",
        answerType: "radio",
        answerChoices: [
          { text: "x = 3", isCorrect: false, order: 1 },
          { text: "x = 4", isCorrect: true, order: 2 },
          { text: "x = 5", isCorrect: false, order: 3 },
          { text: "x = 6", isCorrect: false, order: 4 },
        ],
        correctAnswers: [1],
        difficulty: "Medium",
        status: "pending",
        recommendedBy: mentors[1]._id,
      },
    ]);
    console.log("✅ Question Recommendations created:", questionRecommendations.length);

    console.log("\n🎉 Database reset and seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`- SuperAdmin: 1 (${superAdminEmail})`);
    console.log(`- Schools: ${schools.length}`);
    console.log(`- Lead Mentors: ${leadMentorProfiles.length}`);
    console.log(`- School Admins: ${schoolAdminProfiles.length}`);
    console.log(`- Mentors: ${mentorProfiles.length}`);
    console.log(`- Students: ${studentProfiles.length}`);
    console.log(`- Questions: ${sampleQuestions.length}`);
    console.log(`- Question Recommendations: ${questionRecommendations.length}`);

    console.log("\n🔑 Default Passwords:");
    console.log("- SuperAdmin: admin123 (or from env)");
    console.log("- Lead Mentors: leadmentor123");
    console.log("- School Admins: schooladmin123");
    console.log("- Mentors: mentor123");
    console.log("- Students: student123");

    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error resetting and seeding database:", err.message);
    console.error(err);
    process.exit(1);
  }
};

run();
