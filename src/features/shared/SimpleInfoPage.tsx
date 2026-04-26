import { Card } from "../../shared/components/ui/card";

interface SimpleInfoPageProps {
  title: string;
  description: string;
}

export function SimpleInfoPage({ title, description }: SimpleInfoPageProps) {
  return (
    <Card className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
    </Card>
  );
}
