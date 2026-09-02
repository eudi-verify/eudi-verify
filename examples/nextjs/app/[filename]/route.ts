import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const sharedDir = join(process.cwd(), "../../../shared");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (filename.startsWith("demo-") && filename.endsWith(".js")) {
    try {
      const filePath = join(sharedDir, filename);
      const fileContent = readFileSync(filePath, "utf-8");

      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "application/javascript",
        },
      });
    } catch {
      return new NextResponse("File Not Found", { status: 404 });
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
