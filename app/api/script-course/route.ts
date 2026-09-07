import { NextRequest, NextResponse } from "next/server";
import { scriptCourses } from "../../script-courses";
import type { FoundationLanguage } from "../../multilingual-foundation";

export function GET(request: NextRequest) {
 const language = request.nextUrl.searchParams.get("language") || "";
 if (!Object.hasOwn(scriptCourses, language)) return NextResponse.json({ error: "Unknown language" }, { status: 400 });
 const course = scriptCourses[language as FoundationLanguage];
 const unitId = request.nextUrl.searchParams.get("unit");
 if (!unitId) return NextResponse.json({ language, revision: course.revision, status: course.status, convention: course.convention, inventory: course.inventory, requirements: course.requirements, lessons: course.lessons.map(({ id, title, prerequisites, strand }) => ({ id, title, prerequisites, strand })) }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
 const unit = course.lessons.find(lesson => lesson.id === unitId);
 if (!unit) return NextResponse.json({ error: "Unknown unit" }, { status: 404 });
 if (request.nextUrl.searchParams.get("revision") !== String(course.revision)) return NextResponse.json({ error: "Refresh course index" }, { status: 409 });
 return NextResponse.json({ language, revision: course.revision, unit }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
