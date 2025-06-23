import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatabaseIcon, DownloadIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type TableData } from '@/shared/schema';

interface DataTableProps {
  data: TableData;
}

export function DataTable({ data }: DataTableProps) {
  // Export table data as CSV
  const exportCsv = () => {
    // Create header row
    const headers = data.headers.map(h => h.label).join(',');
    
    // Create data rows
    const rows = data.rows.map(row => {
      return data.headers.map(header => {
        const value = row[header.key];
        // Quote strings that contain commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',');
    }).join('\n');
    
    // Combine and download
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Card className="border-neutral-200 overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Data Table</CardTitle>
          <div className="flex items-center space-x-2">
            {data.source && (
              <span className="flex items-center text-xs text-success-500">
                <DatabaseIcon className="h-3 w-3 mr-1" /> {data.source}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-neutral-400 hover:text-neutral-700"
              onClick={exportCsv}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                {data.headers.map((header, index) => (
                  <TableHead 
                    key={index} 
                    className={header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'}
                  >
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {data.headers.map((header, cellIndex) => {
                    const value = row[header.key];
                    const isHighlighted = typeof value === 'string' && value.startsWith('$') && rowIndex === data.rows.length - 1;
                    
                    return (
                      <TableCell 
                        key={cellIndex}
                        className={`
                          ${header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'}
                          ${isHighlighted ? 'font-medium text-success-500' : ''}
                        `}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
