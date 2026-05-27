import { AppShell } from "@/components/app-shell";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const chatId = typeof params.chatId === "string" ? params.chatId : undefined;
  
  return <AppShell chatId={chatId} />;
}
