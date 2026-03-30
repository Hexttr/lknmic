export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex-1 bg-zinc-50 text-zinc-900">{children}</div>
  );
}
