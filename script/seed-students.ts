import "dotenv/config";
import { randomBytes } from "crypto";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { gradeLevels, sections, students } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const schools = await storage.getSchools();
  if (schools.length === 0) {
    throw new Error("No schools found. Create a school first (via seed or UI) then rerun.");
  }

  const school = schools[0];

  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(students)
    .where(eq(students.schoolId, school.id));

  if (existingCount > 0) {
    console.log(`Students already exist for school ${school.name} (count: ${existingCount}). Skipping.`);
    return;
  }

  // Ensure grade levels
  let schoolGrades = await storage.getGradeLevels(school.id);
  if (schoolGrades.length === 0) {
    const defaults = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
    for (const name of defaults) {
      await storage.createGradeLevel({ schoolId: school.id, name });
    }
    schoolGrades = await storage.getGradeLevels(school.id);
  }

  // Ensure sections (use first two grades)
  let schoolSections = await storage.getSections(school.id);
  if (schoolSections.length === 0) {
    const targetGrades = schoolGrades.slice(0, Math.min(2, schoolGrades.length));
    for (const gl of targetGrades) {
      await storage.createSection({ schoolId: school.id, gradeLevelId: gl.id, name: "Section A" });
      await storage.createSection({ schoolId: school.id, gradeLevelId: gl.id, name: "Section B" });
    }
    schoolSections = await storage.getSections(school.id);
  }

  const firstNames = [
    "Juan", "Maria", "Carlos", "Ana", "Pedro", "Sofia", "Miguel", "Isabella",
    "Antonio", "Lucia", "Gabriel", "Valentina", "Rafael", "Camila", "Diego",
    "Emma", "Sebastian", "Mia", "Mateo", "Victoria", "Daniel", "Natalia",
    "Alejandro", "Daniela", "Fernando", "Adriana", "Ricardo", "Paula",
    "Francisco", "Andrea",
  ];
  const lastNames = [
    "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Torres", "Ramos",
    "Flores", "Cruz", "Lopez", "Martinez", "Rodriguez", "Hernandez", "Gonzalez",
    "Rivera", "Perez", "Sanchez", "Ramirez", "Morales", "Castillo", "Ortiz",
    "Gomez", "Diaz", "Vargas", "Romero", "Castro", "Alvarez", "Ruiz",
    "Fernandez", "Jimenez",
  ];

  const total = 30;
  for (let i = 0; i < total; i++) {
    const gradeIdx = Math.floor(i / 5) % schoolGrades.length;
    const sectionIdx = i % schoolSections.length;

    const qrToken = randomBytes(16).toString("hex");
    const phone = `6391${String(7000000 + i).padStart(7, "0")}`;

    await storage.createStudent({
      schoolId: school.id,
      studentNo: `2025-${String(i + 1).padStart(3, "0")}`,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      gradeLevelId: schoolGrades[gradeIdx].id,
      sectionId: schoolSections[sectionIdx].id,
      guardianName: `Parent of ${firstNames[i % firstNames.length]}`,
      guardianPhone: phone,
      qrToken,
      isActive: true,
    });
  }

  console.log(`Seeded ${total} students for school ${school.name}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
