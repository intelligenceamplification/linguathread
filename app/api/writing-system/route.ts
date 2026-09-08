import { NextRequest, NextResponse } from "next/server";
import { writingCourses } from "../../writing-system/curriculum";
import type { FoundationLanguage } from "../../multilingual-foundation";
import { edgeKey } from "../../writing-system/model";

export function GET(request: NextRequest) {
 const language = request.nextUrl.searchParams.get("language") || "";
 if (!Object.hasOwn(writingCourses, language)) return NextResponse.json({ error: "Unknown writing system" }, { status: 400 });
 const course = writingCourses[language as FoundationLanguage];
 const id = request.nextUrl.searchParams.get("unit");
 const headers = { "Cache-Control": "public, max-age=0, must-revalidate" };
 if (!id) return NextResponse.json({ ...course, units: course.units.map(({ exercises, ...unit }) => ({ ...unit, exerciseCount: exercises.length, skills: [...new Map(exercises.map(e => [edgeKey(e), { key: edgeKey(e), direction: e.direction, form: e.direction === "meaning" ? e.cue || "" : e.answer }])).values()] })) }, { headers });
 const version = Number(request.nextUrl.searchParams.get("version"));
 if (version !== course.version) return NextResponse.json({ error: "Course updated. Refresh the path to continue." }, { status: 409 });
 const unit = course.units.find(u => u.id === id);
 return unit ? NextResponse.json({ version, language, unit }, { headers }) : NextResponse.json({ error: "Unknown unit" }, { status: 404 });
}
