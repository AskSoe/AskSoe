import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Bot, UserIcon } from "lucide-react";
import { ChartComponent } from "@/components/visualization/chart";
import { DataTable } from "@/components/visualization/data-table";
import { type Message } from '@/shared/schema';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex items-start">
      <Avatar className="w-10 h-10 bg-neutral-300 text-neutral-600 flex-shrink-0">
        <UserIcon className="h-5 w-5" />
      </Avatar>
      <div className="ml-3 flex-1">
        <div className="bg-primary-50 rounded-lg p-4">
          <p className="text-neutral-800">{message.content}</p>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          {message.timestamp ? format(new Date(message.timestamp), "h:mm a") : ""}
        </div>
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  message: Message;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  // Parse content for special elements
  const parseContent = (content: string) => {
    // Check for chart/table blocks in the content
    const parts = [];
    let lastIndex = 0;
    
    // Check for chart blocks [CHART:{...}]
    const chartRegex = /\[CHART:(.*?)\]/gs;
    let chartMatch;
    
    while ((chartMatch = chartRegex.exec(content)) !== null) {
      // Add text before this match
      if (chartMatch.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="text-neutral-800 mb-3">
            {content.slice(lastIndex, chartMatch.index)}
          </p>
        );
      }
      
      try {
        const chartData = JSON.parse(chartMatch[1]);
        parts.push(
          <div key={`chart-${chartMatch.index}`} className="mb-4">
            <ChartComponent data={chartData} />
          </div>
        );
      } catch (e) {
        console.error("Failed to parse chart data:", e);
        parts.push(
          <p key={`chart-error-${chartMatch.index}`} className="text-red-500 mb-3">
            Error displaying chart: Invalid data format
          </p>
        );
      }
      
      lastIndex = chartMatch.index + chartMatch[0].length;
    }
    
    // Check for table blocks [TABLE:{...}]
    const tableRegex = /\[TABLE:(.*?)\]/gs;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(content)) !== null) {
      // Add text before this match
      if (tableMatch.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="text-neutral-800 mb-3">
            {content.slice(lastIndex, tableMatch.index)}
          </p>
        );
      }
      
      try {
        const tableData = JSON.parse(tableMatch[1]);
        parts.push(
          <div key={`table-${tableMatch.index}`} className="mb-4">
            <DataTable data={tableData} />
          </div>
        );
      } catch (e) {
        console.error("Failed to parse table data:", e);
        parts.push(
          <p key={`table-error-${tableMatch.index}`} className="text-red-500 mb-3">
            Error displaying table: Invalid data format
          </p>
        );
      }
      
      lastIndex = tableMatch.index + tableMatch[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      // Split by newlines and create proper paragraphs
      const remainingText = content.slice(lastIndex);
      const paragraphs = remainingText.split('\n\n');
      
      paragraphs.forEach((paragraph, i) => {
        // Check if paragraph is a list
        if (paragraph.includes('- ')) {
          const listItems = paragraph.split('- ').filter(Boolean);
          parts.push(
            <ul key={`list-${i}`} className="list-disc pl-5 mb-3 text-neutral-800 space-y-1">
              {listItems.map((item, j) => (
                <li key={`item-${j}`}>{item.trim()}</li>
              ))}
            </ul>
          );
        } else {
          parts.push(
            <p key={`para-${i}`} className="text-neutral-800 mb-3">
              {paragraph}
            </p>
          );
        }
      });
    }
    
    return parts;
  };
  
  return (
    <div className="flex items-start">
      <Avatar className="w-10 h-10 bg-primary-500 text-white flex-shrink-0">
        <Bot className="h-5 w-5" />
      </Avatar>
      <div className="ml-3 flex-1">
        <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
          {parseContent(message.content)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          {message.timestamp ? format(new Date(message.timestamp), "h:mm a") : ""} 
          {message.systemSources && (message.systemSources as string[]).length > 0 && (
            <>
              {" · Sources: "}
              {(message.systemSources as string[]).join(", ")}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
