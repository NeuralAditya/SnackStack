
import { Progress } from "@/components/ui/progress";

const statusToProgress: Record<string, number> = {
  pending: 20,
  preparing: 40,
  ready: 80,
  completed: 100,
  cancelled: 100
};

const statusToColor: Record<string, string> = {
  pending: "bg-yellow-500",
  preparing: "bg-blue-500",
  ready: "bg-green-500",
  completed: "bg-green-600",
  cancelled: "bg-red-500"
};

interface OrderProgressProps {
  status: string;
}

export function OrderProgress({ status }: { status: string }) {
  return (
    <div className="w-full">
      <Progress 
        value={statusToProgress[status]} 
        className={`h-2 ${statusToColor[status]}`}
      />
      <p className="text-sm text-gray-500 mt-1 capitalize">{status}</p>
    </div>
  );
}
