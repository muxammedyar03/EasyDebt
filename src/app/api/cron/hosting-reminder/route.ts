import { NextResponse } from "next/server";
import { checkHostingReminder } from "@/lib/hosting-reminder";

export async function GET() {
  try {
    const count = await checkHostingReminder();

    return NextResponse.json({
      success: true,
      message:
        count > 0
          ? "Hosting to'lovi haqida eslatma yaratildi"
          : "Eslatma yaratilmadi (2-sana emas yoki allaqachon mavjud)",
      count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in hosting reminder cron:", error);
    return NextResponse.json(
      {
        error: "Serverda xatolik yuz berdi",
      },
      { status: 500 },
    );
  }
}
