import ReflectionPage from "../../../living-model/ReflectionPage";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <ReflectionPage sessionId={sessionId} />;
}
