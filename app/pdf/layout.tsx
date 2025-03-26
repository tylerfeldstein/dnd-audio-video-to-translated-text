import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AboutLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="w-full">{children}</div>
    </section>
  );
}
