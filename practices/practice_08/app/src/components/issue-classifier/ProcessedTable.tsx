import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProcessedIssue } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

export function ProcessedTable({ rows }: { rows: ProcessedIssue[] }) {
  return (
    <Card>
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="text-lg">Обработанные Issue</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-11">Issue</TableHead>
              <TableHead className="h-11 sm:w-28">Тип</TableHead>
              <TableHead className="h-11 text-right sm:w-28">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-28 text-center text-muted-foreground">
                  Пока нет обработанных Issue
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.repository}#${r.issueNumber}`}>
                  <TableCell className="py-3">
                    <div className="font-medium">
                      {r.repository}
                      <span className="text-muted-foreground"> #{r.issueNumber}</span>
                    </div>
                    <div className="max-w-[7rem] truncate text-muted-foreground sm:max-w-md">
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <TypeBadge type={r.type} />
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    {r.confidence.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
