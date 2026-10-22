import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title} workspace</CardTitle>
          <CardDescription>
            The React migration for this section is in place and ready for live API-backed
            views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next step: connect this page to its backend endpoints and replace the placeholder
            content with tables, forms, and charts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
