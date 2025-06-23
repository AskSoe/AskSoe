import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatabaseIcon, MaximizeIcon } from 'lucide-react';
import Chart from 'chart.js/auto';
import { type ChartData } from '@/shared/schema';

interface ChartComponentProps {
  data: ChartData;
}

export function ChartComponent({ data }: ChartComponentProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<any> | null>(null);
  
  // Create or update chart when data changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    const chartConfig = {
      type: data.type,
      data: {
        labels: data.labels,
        datasets: data.datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top' as const,
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
          },
        },
      }
    };
    
    chartInstanceRef.current = new Chart(ctx, chartConfig);
    
    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);
  
  return (
    <Card className="bg-neutral-50 border-neutral-200">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{data.title}</CardTitle>
          <div className="flex items-center text-xs text-neutral-500">
            {data.source && (
              <span className="flex items-center text-success-500 mr-4">
                <DatabaseIcon className="h-3 w-3 mr-1" /> {data.source}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-neutral-700">
              <MaximizeIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-64 w-full">
          <canvas ref={chartRef} />
        </div>
      </CardContent>
    </Card>
  );
}
