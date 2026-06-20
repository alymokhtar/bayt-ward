import { Card, CardContent } from "@/components/ui/Card";

export default function CashRegisterLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-brown/5" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-brown/5" />
          <div className="h-4 w-56 rounded bg-brown/5" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="h-10 w-full max-w-md rounded-lg bg-brown/5" />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 rounded bg-brown/5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 rounded bg-brown/5" />
        </CardContent>
      </Card>
    </div>
  );
}
