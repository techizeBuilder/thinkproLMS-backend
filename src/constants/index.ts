export const ROLES = {
  SuperAdmin: "superadmin",
  LeadMentor: "leadmentor",
  SchoolAdmin: "schooladmin",
  Mentor: "mentor",
  Student: "student",
  Guest: "guest",
} as const;

export const PERMISSIONS = {
  ADD_RESOURCES: "add_resources",
  ADD_MODULES: "add_modules", 
  ADD_STUDENTS: "add_students",
  ADD_ADMINS: "add_admins",
  ADD_MENTORS: "add_mentors",
} as const;

export const dbName = "thinkpro-lms";
