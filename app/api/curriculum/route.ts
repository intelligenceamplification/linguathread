import { curriculum } from "../../curriculum";
import { mergeCurriculum, validateManifest, validatePack } from "../../curriculum-packs";

export const dynamic = "force-dynamic";

const manifestUrl = process.env.CURRICULUM_MANIFEST_URL ||
  "https://raw.githubusercontent.com/intelligenceamplification/polyflow/curriculum-data/curriculum/manifest.json";

export async function GET() {
  try {
    const manifestResponse = await fetch(manifestUrl, { next: { revalidate: 300 } });
    if (!manifestResponse.ok) throw new Error(`Manifest returned ${manifestResponse.status}.`);
    const manifest = validateManifest(await manifestResponse.json());
    const packs = await Promise.all(manifest.packs.map(async (descriptor) => {
      const response = await fetch(descriptor.url, { next: { revalidate: 300 } });
      if (!response.ok) throw new Error(`Pack ${descriptor.id} returned ${response.status}.`);
      return validatePack(await response.json(), descriptor);
    }));
    const lessons = mergeCurriculum(curriculum, packs);
    return Response.json({
      courseId: manifest.courseId,
      revision: manifest.revision,
      source: "published",
      lessonCount: lessons.length,
      lessons,
    });
  } catch (error) {
    console.error("Curriculum pack loading failed; using bundled curriculum.", error);
    return Response.json({
      courseId: "english-spanish-vietnamese",
      revision: 0,
      source: "bundled",
      lessonCount: curriculum.length,
      lessons: curriculum,
    });
  }
}
