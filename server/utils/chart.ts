
// Function to generate chart data for demo purposes
export function generateChart(
  type: "bar" | "line" | "pie" | "scatter", 
  title: string, 
  data: any
): ChartData {
  switch (type) {
    case "bar":
      return generateBarChart(title, data);
    case "line":
      return generateLineChart(title, data);
    case "pie":
      return generatePieChart(title, data);
    case "scatter":
      return generateScatterChart(title, data);
    default:
      throw new Error(`Unsupported chart type: ${type}`);
  }
}

function generateBarChart(title: string, data: any): ChartData {
  return {
    type: "bar",
    title,
    labels: data.labels || [],
    datasets: [
      {
        label: data.datasetLabel || "Value",
        data: data.values || [],
        backgroundColor: data.colors || generateColors(data.values?.length || 0),
      },
    ],
    source: data.source,
  };
}

function generateLineChart(title: string, data: any): ChartData {
  return {
    type: "line",
    title,
    labels: data.labels || [],
    datasets: [
      {
        label: data.datasetLabel || "Value",
        data: data.values || [],
        borderColor: data.lineColor || "#2563EB",
        backgroundColor: data.fillColor || "rgba(37, 99, 235, 0.1)",
      },
    ],
    source: data.source,
  };
}

function generatePieChart(title: string, data: any): ChartData {
  return {
    type: "pie",
    title,
    labels: data.labels || [],
    datasets: [
      {
        label: data.datasetLabel || "Value",
        data: data.values || [],
        backgroundColor: data.colors || generateColors(data.values?.length || 0),
      },
    ],
    source: data.source,
  };
}

function generateScatterChart(title: string, data: any): ChartData {
  return {
    type: "scatter",
    title,
    labels: data.labels || [],
    datasets: [
      {
        label: data.datasetLabel || "Value",
        data: data.points || [],
        backgroundColor: data.pointColor || "#2563EB",
      },
    ],
    source: data.source,
  };
}

// Generate a set of colors for charts
function generateColors(count: number): string[] {
  const baseColors = [
    "#3B82F6", // primary-500
    "#60A5FA", // primary-400
    "#93C5FD", // primary-300
    "#BFDBFE", // primary-200
    "#8B5CF6", // accent-500
    "#10B981", // success-500
    "#F59E0B", // warning-500
    "#EF4444", // error-500
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // If we need more colors, repeat the base colors
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  
  return colors;
}
